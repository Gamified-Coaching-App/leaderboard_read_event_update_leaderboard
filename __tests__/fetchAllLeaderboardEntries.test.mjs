import { fetchAllLeaderboardEntries } from '../utils.mjs';
import AWS from 'aws-sdk';

// Resetting modules to ensure a clean mock state
beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
});

// Mock AWS library
jest.mock('aws-sdk', () => {
    const getMock = jest.fn();
    const scanMock = jest.fn();

    return {
        DynamoDB: {
            DocumentClient: jest.fn(() => ({
                get: jest.fn((params) => ({ promise: () => getMock(params) })),
                scan: jest.fn((params) => ({ promise: () => scanMock(params) })),
            })),
        },
        getMock,
        scanMock
    };
});

describe('fetchAllLeaderboardEntries function tests', () => {
    // Mock data for the function call
    const newData = {
        user_id: 'user123'
    };

    const mockUserData = {
        Item: {
            bucket_id: 'bucket123'
        }
    };



    it('should fetch all leaderboard entries correctly', async () => {
        const mockScanResponse = {
            Items: [
                { user_id: 'user1', score: 100 },
                { user_id: 'user2', score: 200 }
            ],
            LastEvaluatedKey: null // Indicate no more items
        };

        // Mocking DynamoDB get response
        AWS.getMock.mockResolvedValueOnce(mockUserData);

        // Mocking DynamoDB scan response
        AWS.scanMock.mockResolvedValueOnce(mockScanResponse);

        // Call the function
        const entries = await fetchAllLeaderboardEntries(newData);

        // Assert that DynamoDB get and scan methods are called with correct params
        expect(AWS.getMock).toHaveBeenCalledTimes(1);
        expect(AWS.getMock).toHaveBeenCalledWith({
            TableName: 'leaderboard',
            Key: { 'user_id': newData.user_id }
        });

        // Mocking one loop so startKey will be null
        expect(AWS.scanMock).toHaveBeenCalledTimes(1);
        expect(AWS.scanMock).toHaveBeenCalledWith({
            TableName: 'leaderboard',
            FilterExpression: 'bucket_id = :bucket_id',
            ExpressionAttributeValues: { ':bucket_id': mockUserData.Item.bucket_id },
            ExclusiveStartKey: null,
        });

        // Assert the returned entries
        expect(entries).toEqual(mockScanResponse.Items);
    });

    it('should fetch leaderboard entries with multiple pages', async () => {
        // Mocking DynamoDB get response
        AWS.getMock.mockResolvedValueOnce(mockUserData);

        // Mocking DynamoDB scan response with multiple pages
        const mockScanResponsePage1 = {
            Items: [
                { user_id: 'user1', score: 100 },
                { user_id: 'user2', score: 200 }
            ],
            LastEvaluatedKey: { user_id: 'user2' } // Indicate more items
        };

        const mockScanResponsePage2 = {
            Items: [
                { user_id: 'user3', score: 300 },
                { user_id: 'user4', score: 400 }
            ],

            LastEvaluatedKey: null // Indicate no more items
        };

        AWS.scanMock.mockResolvedValueOnce(mockScanResponsePage1);
        AWS.scanMock.mockResolvedValueOnce(mockScanResponsePage2);

        // Call the function
        const entries = await fetchAllLeaderboardEntries(newData);

        // Assert that DynamoDB get and scan methods are called with correct params
        expect(AWS.getMock).toHaveBeenCalledTimes(1);
        expect(AWS.getMock).toHaveBeenCalledWith({
            TableName: 'leaderboard',
            Key: { 'user_id': newData.user_id }
        });

        // Assert the DynamoDB scan method is called twice
        expect(AWS.scanMock).toHaveBeenCalledTimes(2);

        // Assert the returned entries
        expect(entries).toEqual([
            ...mockScanResponsePage1.Items,
            ...mockScanResponsePage2.Items
        ]);
    });

    it('should return an empty array if user is not found', async () => {
        // Mocking DynamoDB get response where user is not found
        AWS.getMock.mockResolvedValueOnce({});

        // Call the function
        const entries = await fetchAllLeaderboardEntries(newData);

        // Assert that DynamoDB get method is called with correct params
        expect(AWS.getMock).toHaveBeenCalledTimes(1);
        expect(AWS.getMock).toHaveBeenCalledWith({
            TableName: 'leaderboard',
            Key: { 'user_id': newData.user_id }
        });

        // Assert the returned entries is an empty array
        expect(entries).toEqual([]);
    });


});
