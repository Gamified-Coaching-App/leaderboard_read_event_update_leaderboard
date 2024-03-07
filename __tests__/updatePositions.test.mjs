import { updatePositions } from '../utils.mjs';
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

describe('updatePositions function tests', () => {
    const mockEntries = [
        { user_id: 'user1', aggregate_skills_season: 100, position_new: 2 },
        { user_id: 'user2', aggregate_skills_season: 200, position_new: 1 },
        { user_id: 'user3', aggregate_skills_season: 150, position_new: 3 }
    ];

    it('should update positions correctly', async () => {
        // Mocking DynamoDB update response
        AWS.updateMock.mockResolvedValueOnce({});

        // Call the function
        const updatedUserIds = await updatePositions(mockEntries);

        // Assert that DynamoDB update method is called with correct params
        expect(AWS.updateMock).toHaveBeenCalledTimes(2);

        expect(AWS.updateMock).toHaveBeenCalledWith({
            TableName: 'leaderboard',
            Key: { 'user_id': 'user3' },
            UpdateExpression: 'set position_new = :newPos',
            ExpressionAttributeValues: { ':newPos': 2 },
            ConditionExpression: 'attribute_exists(user_id)'
        });
        expect(AWS.updateMock).toHaveBeenCalledWith({
            TableName: 'leaderboard',
            Key: { 'user_id': 'user1' },
            UpdateExpression: 'set position_new = :newPos',
            ExpressionAttributeValues: { ':newPos': 3 },
            ConditionExpression: 'attribute_exists(user_id)'
        });

        // Assert the returned updated user IDs
        expect(updatedUserIds).toEqual(['user3', 'user1']);
    });

    it('should handle empty entries array', async () => {
        // Call the function with an empty entries array
        const updatedUserIds = await updatePositions([]);

        // Assert that DynamoDB update method is not called
        expect(AWS.updateMock).not.toHaveBeenCalled();

        // Assert the returned updated user IDs is an empty array
        expect(updatedUserIds).toEqual([]);
    });
});
