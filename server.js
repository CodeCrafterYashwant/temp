const express = require('express')
const app = express();
const db = require('./db');  
require('dotenv').config();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const {jwtAuthMiddleware} = require('./jwt');

const PORT = process.env.PORT || 3000;

 

const userRoutes = require('./Routes/userRoutes');
const attendanceRoutes = require('./Routes/attendanceRoutes');

app.use('/user', userRoutes);
app.use('/attendance', attendanceRoutes);


app.listen(PORT,()=>{
    console.log("listing on port:",PORT);
})
