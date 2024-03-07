import { handler } from '../index.mjs';
import AWS from 'aws-sdk';
import { updateUserData, fetchAllLeaderboardEntries, updatePositions } from '../utils.mjs';

// Resetting modules to ensure a clean mock state
beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
});

// Mock AWS library
jest.mock('aws-sdk', () => {

    const scanMock = jest.fn();
    const updateMock = jest.fn();

    return {
        DynamoDB: {
            DocumentClient: jest.fn(() => ({
                scan: jest.fn(() => ({ promise: scanMock })),
                update: jest.fn(() => ({ promise: updateMock }))
            })),
        },
        scanMock,
        updateMock
    };
});

// Mock utils module
jest.mock('../utils.mjs', () => ({
    updateUserData: jest.fn(),
    fetchAllLeaderboardEntries: jest.fn(),
    updatePositions: jest.fn()
}));

describe('handler function tests', () => {
    const event = {
        detail: { test: "mocking" }
    };

    it('should process event successfully', async () => {
        // Mocking function calls
        updateUserData.mockResolvedValueOnce();
        fetchAllLeaderboardEntries.mockResolvedValueOnce([]);
        updatePositions.mockResolvedValueOnce([]);

        // Call the handler function
        const result = await handler(event);

        // Assert function calls and return value
        expect(updateUserData).toHaveBeenCalledWith(event.detail);
        expect(fetchAllLeaderboardEntries).toHaveBeenCalledWith(event.detail);
        expect(updatePositions).toHaveBeenCalled();
        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify('Event processed successfully!')
        });
    });

    it('should handle error during processing', async () => {
        const errorMessage = 'Error during processing';
        // Mocking function calls
        updateUserData.mockRejectedValueOnce(errorMessage);

        // Call the handler function
        const result = await handler(event);

        // Assert function calls and return value
        expect(updateUserData).toHaveBeenCalledWith(event.detail);
        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify('Error processing event')
        });
    });
});
