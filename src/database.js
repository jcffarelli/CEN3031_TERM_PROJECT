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

async function getZip(username){
    try {
        // Retrieve the item from the database
        const item = await getItem({ username: { S: username } });

        // Check if the item exists and return the zipCode
        if (item && item.zip_code) {
            return item.zip_code.N; 
        } else {
            console.log("No zipCode found for the given username.");
            return null;
        }
    } catch (error) {
        console.error("Error retrieving zipCode:", error);
        throw error;
    }
}

async function confirmLogin(username, password){
    try{
        const item = await getItem({ username: { S: username } });
        // check if username in system
        if(!item){
            console.log("Username not in database");
            return false;
        }
        else if(item.password.S != password){
            console.log("Password Does not match username");
            return false;
        }
        else{
            console.log("Sucess!")
            return true;
        }
    }
    catch{error}{
        console.error("Error: ", error);
    }
}

(async () => {
    const result = await confirmLogin("Test_User", "Test_Password");
    console.log("Login Confirmation:", result);
})();



async function inputUserInfo(username, password, zip_code) {
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
                zip_code: {N: zip_code.toString()}
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
    inputUserInfo,
    getZip,
    confirmLogin
};