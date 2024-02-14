// handler.mjs
export const handler = async (event) => {
    try {
      // Extract details from the event
      const { user_id, timestamp_local, session_id, activity_type, distance_in_meters } = event.detail;
  
      // Log extracted details to the console
      console.log(`User ID: ${user_id}`);
      console.log(`Timestamp: ${timestamp_local}`);
      console.log(`Session ID: ${session_id}`);
      console.log(`Activity Type: ${activity_type}`);
      console.log(`Distance in Meters: ${distance_in_meters}`);
    } catch (error) {
      console.error(`Error processing event: ${error}`);
      // Handle the error appropriately
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