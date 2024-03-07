import { updateUserData } from '../utils.mjs';
import AWS from 'aws-sdk';

// Resetting modules to ensure a clean mock state
beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
});

// Mock AWS library
jest.mock('aws-sdk', () => {
    const updateMock = jest.fn();

    return {
        DynamoDB: {
            DocumentClient: jest.fn(() => ({
                update: jest.fn((params) => ({ promise: () => updateMock(params) }))
            })),
        },
        updateMock
    };
});

describe('updateUserData function tests', () => {
    // SET UP RESPONSES
    // Mock data for the function call
    const newData = {
        user_id: 'user123',
        distance_in_meters: 1000,
        points_gained: '{"endurance": 50, "total": 150}'
    };

    const mockUpdateResponse = {};

    it('should update user data in DynamoDB correctly', async () => {
        // Set up expected parameters for the DynamoDB update call
        const expectedParams = {
            TableName: "leaderboard",
            Key: { "user_id": newData.user_id },
            UpdateExpression: "ADD aggregate_skills_season :aggregate_skills, endurance_season :endurance_skills",
            ExpressionAttributeValues: {
                ":aggregate_skills": 150,
                ":endurance_skills": 50
            },
        };

        AWS.updateMock.mockResolvedValueOnce(mockUpdateResponse);

        // Call the function
        await updateUserData(newData);

        expect(AWS.updateMock).toHaveBeenCalledTimes(1);
        expect(AWS.updateMock).toHaveBeenCalledWith(expectedParams);
    
    });

});
