import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function updateUserData(newData) {
    const { user_id, distance_in_meters, points_gained } = newData;
    const points_gainedJSON = JSON.parse(points_gained);

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
    console.log(params);
    await dynamoDb.update(params).promise();
    console.log('DynamoDB updated successfully for user:', user_id);
}


export async function fetchAllLeaderboardEntries(newData) {
    const { user_id } = newData;
    // Get user_id's bucket_id
    const userParams = {
        TableName: "leaderboard",
        Key: {
            "user_id": user_id
        }
    };
    const userData = await dynamoDb.get(userParams).promise();
    if (!userData.Item || !userData.Item.bucket_id) {
        console.log("no users with that id!");
        return [];
    }

    const bucket_id = userData.Item.bucket_id;

    // Retrieve relevant data from leaderboard
    const params = {
        TableName: "leaderboard",
        FilterExpression: "bucket_id = :bucket_id",
        ExpressionAttributeValues: {
            //":user_id": user_id,
            ":bucket_id": bucket_id
        }
    };
    const entries = [];
    let items;
    do {
        items = await dynamoDb.scan(params).promise();
        entries.push(...items.Items);
        params.ExclusiveStartKey = items.LastEvaluatedKey;
        console.log(params.ExclusiveStartKey);
    } while (items.LastEvaluatedKey);
    
    return entries;
}


export async function updatePositions(entries) {
    const sortedEntries = entries.sort((a, b) => b.aggregate_skills_season - a.aggregate_skills_season);
    const updates = [];
    const updatedUsers = [];
    console.log(sortedEntries);
    for (let i = 0; i < sortedEntries.length; i++) {
        const newPosition = i + 1;
        if (sortedEntries[i].position_new !== newPosition) {
            console.log(newPosition);
            console.log(sortedEntries[i]);
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

            // updates.push(dynamoDb.update(updateParams).promise().catch(error => console.error('Update failed for user:', sortedEntries[i].user_id, error)));
            updates.push(
                (async () => {
                    try {
                        await dynamoDb.update(updateParams).promise();
                    } catch (error) {
                        console.error('Update failed for user:', sortedEntries[i].user_id, error);
                    }
                })()
            );
            updatedUsers.push(sortedEntries[i].user_id);
            
        }
    }
    console.log(updatedUsers);
    await Promise.all(updates);
    return updatedUsers; // Return updated user IDs
    // return updates.map((_, index) => sortedEntries[index].user_id); 
}
