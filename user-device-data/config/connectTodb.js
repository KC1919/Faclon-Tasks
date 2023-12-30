const mongoose = require('mongoose');
const DB_URL='mongodb+srv://kunal_1920:lDgpsNtNrc5Qk1yP@cluster0.365zpz3.mongodb.net/deviceDb'

const connectDb = async () => {
    try {
        const conn = await mongoose.connect(process.env.DB_URL);
        if(conn!==null){
            console.log("Databse connnectd!");
        }
    } catch (error) {
        console.log('Failed toconnect to mongodb, server error!', error);
    }
}

module.exports=connectDb;