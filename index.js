import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import path from 'path';
import ejs from "ejs";
import { Mutex } from 'async-mutex';
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";
import OpenAI from "openai";
import bodyParser from "body-parser";

dotenv.config();

let key;

const openai = new OpenAI({ apiKey: `${key}` });


const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: 1 }));


// const asyncMutex = new Mutex(); // Create a mutex to synchronize access to shared resources

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const Name = file.fieldname + '-' + uniqueSuffix + extension;
        cb(null, Name);
    }
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/upload", upload.single('photoImg'), async (req, res) => {
    console.log(req.file);
    console.log(req.body.btnradio);
    let textprompt = "Correct any errors and extract the text exactly as written. Ensure accuracy in spelling and grammar. If any inaccuracies are present, provide corrections based on the context.";
    let summaryprompt = "This is an OCR-generated text. Please ensure accurate extraction and correct any errors in spelling or grammar. Provide a clear summary of the content, omitting irrelevant details. If anything is unclear, provide a clarification based on the context. ";
    let prompt;
    key = req.body.api_key;
    console.log(key)
    if (req.body.btnradio == 'text') {

        prompt = textprompt;

    } else {

        prompt = summaryprompt;

    }



    if (req.file) {
        const imagePath = path.join(__dirname, "uploads", req.file.filename);

        // const release = await asyncMutex.acquire(); // Acquire the mutex

        const read = fs.readFileSync(imagePath);
        let resp;

        await axios.post("https://api.apilayer.com/image_to_text/upload", read, {
            headers: {
                'apikey': process.env.API_KEY,
                'Content-Type': 'multipart/form-data',
            },
        })
            .then(response => {
                console.log(response.data);
                resp = response.data.all_text;
                // res.render("index.ejs", { text: response.data.all_text });
            })
            .catch(error => {
                console.error('Error:', error.response ? error.response.data : error.message);
            });



        //Request to open ai server

        try {

            async function main() {
                const completion = await openai.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant designed to extract quality text and do further assist",
                        },
                        { role: "user", content: `${prompt} , "${resp}"` },
                    ],
                    model: "gpt-3.5-turbo-1106",
                    // header:{
                    //     'authorization':`Bearer ${process.env.OPENAI_API_KEY}`,
                    // },
                })

                console.log(completion.choices[0].message.content);
                res.render("index.ejs", { text: completion.choices[0].message.content, key: key });
            }

            main();


        } catch (error) {
            console.log(error.message);
        }




        // finally {
        //     release(); // Release the mutex to allow the next request to proceed
        // }
    }
});

app.listen(port, () => {
    console.log("The server is listening on the port", port);
});
