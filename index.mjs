import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
    // const userId = event.detail.user_id;
    try {
        // Update user with the updated data
        await updateUserData(event.detail);
        console.log("User's aggregate skills updated!");

        // Recalculate positions
        // TODO : maybe don't need to bother with computations if bucket_id = -1. bucket_id is retrieved in fetchAll.. function
        const entries = await fetchAllLeaderboardEntries(event.detail);
        console.log(entries);
        const updatedEntries = await updatePositions(entries);
        console.log("Positions updated for ", updatedEntries.length, "users.");
    } catch (error) {
        console.error('Error updating', error);
        return {
            statusCode: 500,
            body: JSON.stringify('Error processing event')
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify('Event processed successfully!')
    };
};

async function updateUserData(newData) {
    const { user_id, distance_in_meters, points_gained } = newData;
    const points_gainedJSON = JSON.parse(points_gained);

    // Compute skill points
    // const distanceInKm = distance_in_meters / 1000;
    // const endurancePoints = distanceInKm;
    // const aggPoints = endurancePoints;

    const endurancePoints = parseInt(points_gainedJSON.endurance);
    const aggPoints = parseInt(points_gainedJSON.total);
    console.log(endurancePoints, typeof endurancePoints);
    console.log(aggPoints, typeof aggPoints);

    const params = {
        TableName: "leaderboard",
        Key: { "user_id": user_id },
        UpdateExpression: "ADD aggregate_skills_season :aggregate_skills, endurance_season :endurance_skills",
        ExpressionAttributeValues: { 
            ":aggregate_skills": aggPoints, 
            ":endurance_skills": endurancePoints},
    };

    await dynamoDb.update(params).promise();
    console.log('DynamoDB updated successfully for user:', user_id);
}

async function fetchAllLeaderboardEntries(newData) {
    const { user_id } = newData;
    // Get user_id's bucket_id
    const userParams = {
        TableName: "leaderboard",
        Key: {
            "user_id": user_id
        }
    };
    const userData = await dynamoDb.get(userParams).promise();
    const bucket_id = userData.Item.bucket_id;

    // Retrieve relevant data from leaderboard
    const params = {
        TableName: "leaderboard",
        FilterExpression: "user_id = :user_id AND bucket_id = :bucket_id",
        ExpressionAttributeValues: {
            ":user_id": user_id,
            ":bucket_id": bucket_id
        }
    };
    const entries = [];
    let items;
    do {
        items = await dynamoDb.scan(params).promise();
        entries.push(...items.Items);
        params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (items.LastEvaluatedKey);
    
    return entries;
}

async function updatePositions(entries) {
    const sortedEntries = entries.sort((a, b) => b.aggregate_skills_season - a.aggregate_skills_season);
    const updates = [];

    for (let i = 0; i < sortedEntries.length; i++) {
        const newPosition = i + 1;
        if (sortedEntries[i].position_new !== newPosition) {
            const updateParams = {
                TableName: "leaderboard",
                Key: { "user_id": sortedEntries[i].user_id },
                // UpdateExpression: "set position_new = if_not_exists(position_new, :pos), position_new = :newPos",
                UpdateExpression: "set position_new = :newPos",
                ExpressionAttributeValues: {
                    // ":pos": newPosition, // default if position_new doesn't exist
                    ":newPos": newPosition,
                },
                ConditionExpression: "attribute_exists(user_id)" // Ensure item exists
            };

            updates.push(dynamoDb.update(updateParams).promise().catch(error => console.error('Update failed for user:', sortedEntries[i].user_id, error)));
        }
    }

    await Promise.all(updates);
    return updates.map((_, index) => sortedEntries[index].user_id); // Return updated user IDs
}







// // Function to retrieve user data from DynamoDB table
// async function get_existing_user_data(user_id) {
//     try {
//         // Define DynamoDB get parameters
//         const params = {
//             TableName: 'leaderboard',
//             Key: { user_id },
//             ProjectionExpression: 'user_id, bucket_id, skills_season, aggregate_skills_season'
//         };

//         // Get item from DynamoDB table
//         const data = await dynamo_db.get(params).promise();

//         return data; // Return user data if it exists, or null if not found

//     } catch (error) {
//         console.error("User doesn't exist yet!", error);
//         throw error;
//     }
// }


// // Function to add a new row for the user in DynamoDB table
// async function add_user(user_id) {
//     try {
//         // Define DynamoDB put parameters for adding a new row
//         const params = {
//             TableName: 'leaderboard',
//             Item: { user_id } // Assuming userId is the primary key
//         };

//         // Add item to DynamoDB table
//         await dynamo_db.put(params).promise();

//         console.log(`New row added for user ${user_id}`);
//     } catch (error) {
//         console.error('Error adding user:', error);
//         throw error;
//     }
// }


// // Function to update data into DynamoDB
// async function update_user_data(current_data, new_data) {

//     // Extract new data
//     const id = new_data.user_id;
//     const distance_in_meters = new_data.distance_in_meters;

//     // Calculate additions to individual skills
//     const endurance_updated = current_data.skills_season.endurance + distance_in_meters / 1000;

//     // Compute new skills map
//     const new_skills = {
//         'endurance': endurance_updated,
//         'strength': current_data.skills_season.strength
//     };

//     // Calculate new aggregate
//     const aggregate_updated = endurance_updated;

//     // Now make the update to the table
//     const params = {
//         TableName: "leaderboard",
//         Key: {
//             user_id: id
//         },
//         UpdateExpression: "SET skills_season = :skills, aggregate_skills_season = :aggregate",
//         ExpressionAttributeValues: {
//             ":skills": new_skills,
//             ":aggregate": aggregate_updated
//         },
//     };

//     try {
//         await dynamo_db.update(params).promise();
//         console.log('DynamoDB updated successfully');
//     } catch (error) {
//         console.error('Error updating DynamoDB:', error);
//         throw error; // Consider how to handle this error.
//     }
// }

// async function update_positions(bucket) {
//     try {
//         // Query users in the same bucket
//         const users_in_bucket = await get_bucket_users(bucket);

//         // Sort users by aggregate score in descending order
//         users_in_bucket.sort((a, b) => b.aggregateScore - a.aggregateScore);

//         // Update positions based on ranking in the sorted list
//         users_in_bucket.forEach((user, index) => {
//             const new_pos = index + 1; // Positions start from 1
//             if (user.position !== new_pos) {
//                 user.position = new_pos; // Update position
//             }
//         });

//         // Update positions in DynamoDB table
//         await updatePositionsInDynamoDB(users_in_bucket);

//         console.log(`Positions updated for users in bucket ${bucket}`);
//     } catch (error) {
//         console.error('Error updating positions:', error);
//         throw error;
//     }
// }


// // Function to query users in the same bucket from DynamoDB table
// async function get_bucket_users(bucket) {
//     try {
//         // Define DynamoDB query parameters
//         const params = {
//             TableName: 'leaderboard',
//             IndexName: 'bucket-index', // Assuming you have an index on the bucket column
//             KeyConditionExpression: '#bucket = :bucketValue',
//             ExpressionAttributeNames: {
//                 '#bucket': 'bucket'
//             },
//             ExpressionAttributeValues: {
//                 ':bucketValue': bucket
//             }
//         };

//         // Query users in the same bucket
//         const data = await dynamo_db.query(params).promise();

//         return data.Items; // Return the list of users
//     } catch (error) {
//         console.error('Error querying users:', error);
//         throw error;
//     }
// }


// // Function to update positions in DynamoDB table
// async function updatePositionsInDynamoDB(users) {
//     try {
//         // Update positions for each user in the list
//         const updatePromises = users.map(user => {
//             const params = {
//                 TableName: 'your-dynamodb-table-name',
//                 Key: { user_id: user.user_id }, // Assuming user_id is the primary key
//                 UpdateExpression: 'SET #position = :positionValue',
//                 ExpressionAttributeNames: {
//                     '#position': 'position'
//                 },
//                 ExpressionAttributeValues: {
//                     ':positionValue': user.position
//                 }
//             };
//             return dynamoDB.update(params).promise();
//         });

//         // Execute all update operations in parallel
//         await Promise.all(updatePromises);
//     } catch (error) {
//         console.error('Error updating positions in DynamoDB:', error);
//         throw error;
//     }
// }