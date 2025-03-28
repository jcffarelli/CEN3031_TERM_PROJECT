// imports
import dotenv from "dotenv";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

dotenv.config();

// initialize client
const client = new DynamoDBClient({region: "us-east-2"});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "Users";

import { GetItemCommand } from "@aws-sdk/client-dynamodb";

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

export async function getOrganizationVal(key){
    try{
        const item = await getItem(key);
        return item.Organization.BOOL;
    }
    catch(error){
        console.error("Error:", error);
    }
}

export async function getAge(key){
    try{
        const item = await getItem(key);
        return item.Age.N;
    }
    catch(error){
        console.error("Error:", error);
    }
}

import { PutItemCommand } from "@aws-sdk/client-dynamodb";

export async function inputUserInfo(username, password){
    try{
        // checking for existing user
        const existingUser = await getItem({username: {username}});
        console.log(existingUser);
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
        
        console.log(response.$metadata.httpStatusCode);

        return 0;
    }
    catch(error){
        console.error("Error: ", error);
    }
}

inputUserInfo("Test_User", "Test_Pass")
    .then(result => {
        if (result == 0){
            console.log("User submitted");
        }
        else if(result == -1){
            console.log("User already exists");
        }
    })

