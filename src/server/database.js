// imports
import express from "express";
import dotenv from "dotenv";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


dotenv.config();

const client = new DynamoDBClient({region: "us-east-2"});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "Users";


// gets row info from username
async function getItem(key){
    try {
        const params = {
            TableName: TABLE_NAME,
            Key: key
        };
        const command = new GetItemCommand(params);
        const data = await dynamodb.send(command);
        return data.Item;
    }
    catch(error){
        console.error("Error:", error);
    }
}

async function getOrganizationVal(key){
    try{
        const item = await getItem(key);
        return item.Organization.BOOL;
    }
    catch(error){
        console.error("Error:", error);
    }
}

async function getAge(key){
    try{
        const item = await getItem(key);
        return item.Age.N;
    }
    catch(error){
        console.error("Error:", error);
    }
}

export async function inputUserInfo(username, password){
    try{
        // checking for existing user
        const existingUser = await getItem({username: {S: username}});
        if (existingUser){
            console.log("Username already exists");
            return -1;
        }

        const params = {
            TableName: TABLE_NAME,
            Item: {
                username: { S: username },
                password: { S: password }
            }
        }

        const command = new PutItemCommand(params);
        const response = await dynamodb.send(command);

        return 0;
    }
    catch(error){
        console.error("Error: ", error);
    }
}

