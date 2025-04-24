// imports
const express = require("express");
const dotenv = require("dotenv");
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

dotenv.config();

const client = new DynamoDBClient({
    region: "us-east-2",
    credentials: {
        accessKeyId: "AKIAVII7O655KTAMQB6D",
        secretAccessKey: "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"
    }
});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "Users";

// gets row info from username
async function getItem(key) {
    try {
        const params = {
            TableName: TABLE_NAME,
            Key: key
        };
        const command = new GetItemCommand(params);
        const data = await dynamodb.send(command);
        return data.Item;
    } catch (error) {
        console.error("Error:", error);
    }
}


async function inputUserInfo(username, password, zipCode) {
    try {
        // checking for existing user
        const existingUser = await getItem({ username: { S: username } });
        if (existingUser) {
            console.log("Username already exists");
            return -1;
        }

        const params = {
            TableName: TABLE_NAME,
            Item: {
                username: { S: username },
                password: { S: password },
                zipCode: {I: zipCode}
            }
        };

        const command = new PutItemCommand(params);
        const response = await dynamodb.send(command);

        return 0;
    } catch (error) {
        console.error("Error: ", error);
    }
}

// Export functions
module.exports = {
    getItem,
    inputUserInfo
};