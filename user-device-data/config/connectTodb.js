const mongoose = require('mongoose');

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