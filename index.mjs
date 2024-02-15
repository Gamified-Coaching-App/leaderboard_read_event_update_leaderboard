// Import statements for ES6
import AWS from 'aws-sdk';

const dynamo_db = new AWS.DynamoDB.DocumentClient();

// handler.mjs
export const handler = async (event) => {
    //////////////////////////////////////////////////////////////////////////  
    // Output details to console log -> testing purposes
    // try {
    //     // Extract details from the event
    //     const { user_id, timestamp_local, session_id, activity_type, distance_in_meters } = event.detail;

    //     // Log extracted details to the console
    //     console.log(`User ID: ${user_id}`);
    //     console.log(`Timestamp: ${timestamp_local}`);
    //     console.log(`Session ID: ${session_id}`);
    //     console.log(`Activity Type: ${activity_type}`);
    //     console.log(`Distance in Meters: ${distance_in_meters}`);
    // } catch (error) {
    //     console.error(`Error processing event: ${error}`);
    //     // Handle the error appropriately
    //     return {
    //         statusCode: 500,
    //         body: JSON.stringify('Error processing event')
    //     };
    // }
    /////////////////////////////////////////////////////////////////
    // const user_id = event.detail.user_id;

    try {
        // Check if the user exists in the DynamoDB table
        // const current_data = await get_existing_user_data(user_id);

        // // If the user doesn't exist, add a new row for them and add special bucketing logic
        // if (!current_data) {
        //     console.log("User is not currently in our table!");
        //     await add_user(user_id);
        // }

        // Update user with the updated data
        await update_user_data(event.detail);
        console.log("Table updated!");

        // Update bucketing and positions



        console.log(`DB updated successfully`);
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



async function update_user_data(new_data) {
    // Extract new data
    const id = new_data.user_id;
    const distance_in_km = new_data.distance_in_meters / 1000;

    // Prepare the update parameters for DynamoDB
    // Now we are directly incrementing the endurance and aggregate_skills_season columns
    const params = {
        TableName: "leaderboard",
        Key: {
            "user_id": id
        },
        UpdateExpression: "ADD endurance_season :distance, aggregate_skills_season :distance",
        ExpressionAttributeValues: {
            ":distance": distance_in_km
        },
    };

    try {
        await dynamo_db.update(params).promise();
        console.log('DynamoDB updated successfully');
    } catch (error) {
        console.error('Error updating DynamoDB:', error);
        throw error; // Consider how to handle this error.
    }
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