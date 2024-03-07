import AWS from 'aws-sdk';
import { updateUserData , fetchAllLeaderboardEntries , updatePositions } from './utils.mjs';

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
        console.log("Entries are: ", entries);
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
