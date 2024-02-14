// Import statements for ES6
import AWS from 'aws-sdk';
import https from 'https';
import { Agent } from 'http';

const agent = new Agent({ keepAlive: true });
const dynamo_db = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge({ apiVersion: '2015-10-07' });

// Handler function to be exported as a named export
export async function handler(event) {
    const data = JSON.parse(event.body);
    const activities = data.activities;

    // Process user IDs in parallel
    const userIdPromises = activities.map((activity) =>
        get_user_id(activity.userId)
    );
    const user_ids = await Promise.all(userIdPromises);

    // Process each activity
    const processingPromises = activities.map((activity, index) => {
        const user_id = user_ids[index];
        const timestamp_local = convert_to_local_time(
            activity.startTimeInSeconds,
            activity.startTimeOffsetInSeconds
        );

        // Publish to EventBridge and insert into DynamoDB in parallel
        return Promise.all([
            publish_to_event_bridge(
                user_id,
                timestamp_local,
                activity.activityId.toString(),
                activity.activityType,
                activity.distanceInMeters
            ),
            insert_into_dynamo_db(user_id, activity),
        ]);
    });

    // Wait for all the processing to complete
    await Promise.all(processingPromises);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Data processed successfully" }),
    };
}

// Function to make the GET request to retrieve user_id
async function get_user_id(partner_user_id) {
    const url = `https://f53aet9v26.execute-api.eu-west-2.amazonaws.com/dev_1/get-user-id?partner=garmin&partner_user_id=${partner_user_id}`;
    
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed_data = JSON.parse(data);
                    resolve(parsed_data.user_id);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (e) => reject(e));
    });
}

// Function to publish event data to the EventBridge
async function publish_to_event_bridge(user_id, timestamp_local, session_id, activity_type, distance_in_meters) {
    const params = {
        Entries: [
            {
                Source: 'com.mycompany.myapp.activities',
                DetailType: 'ActivityProcessed',
                Detail: JSON.stringify({
                    user_id,
                    timestamp_local,
                    session_id,
                    activity_type,
                    distance_in_meters
                }),
                EventBusName: 'default',
            },
        ],
    };

    try {
        const result = await eventBridge.putEvents(params).promise();
        console.log('Event published:', result);
    } catch (error) {
        console.error('Error publishing event:', error);
        throw error; // Rethrow or handle as needed
    }
}

// Function to insert data into DynamoDB
async function insert_into_dynamo_db(user_id, activity) {
    const params = {
        TableName: "trainings_log",
        Item: {
            user_id: user_id,
            session_id: activity.activityId.toString(), // Ensure session_id is a string
            activity_type: activity.activityType,
            distance_in_meters: activity.distanceInMeters,
        },
    };

    try {
        await dynamo_db.put(params).promise();
        console.log('Data inserted into DynamoDB successfully');
    } catch (error) {
        console.error('Error inserting data into DynamoDB:', error);
        throw error; // Consider how to handle this error.
    }
}

// Function to convert UTC seconds and offset to local time in ISO 8601 format
function convert_to_local_time(utc_seconds, offset_in_seconds) {
    const utc_date = new Date(utc_seconds * 1000); // Convert Unix timestamp to Date object
    const local_date = new Date(utc_date.getTime() + offset_in_seconds * 1000); // Apply offset
    return local_date.toISOString(); // Convert to ISO 8601 format
}