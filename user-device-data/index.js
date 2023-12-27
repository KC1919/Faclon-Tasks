const express = require('express');
const app = express();
const Influx = require('influx');
// const deviceData = require('./INEM_DEMO_DEVICE_DATA.json');
const connectDb = require('./config/connectTodb');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const User = require('./models/userModel');
const Device = require('./models/deviceModel');
const jwt = require('jsonwebtoken');
const verifyUser = require('./middleware/verify');

require('dotenv').config({ path: './config/.env' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const devID = 'INEM_DEMO'

const influx = new Influx.InfluxDB({
    'hostname': 'localhost',
    'database': 'deviceDb',
    'schema': [{
        'measurement': devID,
        'fields': {
            value: Influx.FieldType.FLOAT,
            del: Influx.FieldType.INTEGER
        },
        'tags': [
            'sensor'
        ]
    }]
})


app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const hashPass = await bcrypt.hash(password, 5);

        const newUser = new User({
            'name': name,
            'password': hashPass,
            'email': email
        });

        await newUser.save();

        return res.status(200).json({ message: 'user registered successfully!', success: true });

    } catch (error) {
        console.log('Failed to register user');
        return res.status(500).json({ message: 'Failed to register user!', success: false });
    }
})

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ 'email': email });

        // console.log(user);

        const checkPass = await bcrypt.compare(password, user.password);

        if (checkPass === true) {
            const token = await jwt.sign({ 'userId': email }, process.env.JWT_SECRET);

            res.cookie('secret', token, {
                maxAge: 24 * 60 * 60 * 1000
            });

            return res.status(200).json({ message: 'User logged in successfully!', success: true });
        }
        else {
            return res.status(401).json({ message: 'Failed to log in user!' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Failed to login user, server error!', success: false });
    }
});

app.post('/addUserDevice', verifyUser, async (req, res) => {
    try {
        const { devId } = req.body;
        const result = await User.updateOne({ 'email': req.userId }, { $push: { 'devices': { devId } } });
        if (result.modifiedCount > 0) {
            return res.status(200).json({ message: 'Device added successfully!', success: true });
        }
    } catch (error) {
        console.log('Failed to add device to user account, server error!', error);
        return res.status(500).json({ message: 'Failed to add device to user account, server error!', error: error.message })
    }
})

app.get('/deviceData', verifyUser, async (req, res) => {
    try {

        const { deviceId } = req.body;

        const deviceData = await Device.findOne({ 'devID': deviceId });

        // console.log(deviceData);

        // check if user exist

        // check if device exist in user list of devices
        let userDevices = await User.findOne({ 'email': req.userId, 'devices': { $elemMatch: { 'devId': deviceId } } });

        if (userDevices !== null) {
            // filtering user device from the list of user devices
            let userDevice = userDevices.devices.filter((device) => {
                return device.devId === deviceId;
            })

            userDevice = userDevice[0];

            // fetch latest device data from influxDb
            const result = await influx.query(`SELECT last("value") AS "latest_value" FROM ${userDevice.devId} GROUP BY "sensor"`)

            // console.log(result);
            const calibratedDeviceData = []

            // loop through the sensor data received from inlfuxDb
            result.forEach(sensorData => {

                // extract each available sensor parameters from user device data
                const sensorParams = deviceData.params[sensorData.sensor] ? deviceData.params[sensorData.sensor] : null;

                // check if the params are not null
                if (sensorParams !== null) {

                    let m = 1;
                    let c = 0;
                    let min;
                    let max;
                    let y;

                    // extract value of each parameter from current sensor parameters
                    for (const { paramName, paramValue } of sensorParams) {
                        if (paramName === 'm') m = paramValue * 1;
                        else if (paramName === 'c') c = paramValue * 1;
                        else if (paramName === 'min') min = paramValue * 1;
                        else if (paramName === 'max') max = paramValue * 1;
                    }

                    // get the raw value of the sensor fetched from influxDb
                    const x = sensorData.latest_value;

                    // calibrate the sensor value
                    y = m * x + c;
                    y = (y > max) ? max : (y < min) ? min : y;

                    calibratedDeviceData.push({
                        'sensor': sensorData.sensor,
                        'value': y,
                        'unit': deviceData.unitSelected[sensorData.sensor]
                    })
                }
            })

            return res.status(200).json({
                message: 'Device data', success: true, data: {
                    calibratedDeviceData
                }
            })

        }
    } catch (error) {
        return res.status(500).json({
            message: 'Failed to fetch device data, server error!',
            success: false,
            error: error.message
        })
    }
})

const addDataToMongoDb = async () => {
    try {
        const device = new Device(deviceData);

        await device.save();

        console.log('Device data saved successfully!');
    } catch (error) {
        console.log("Failed to add device data to mongodb!");
    }
}

app.listen(3000, async () => {
    console.log('Server listening on port:3000');
    connectDb();
    // addDataToMongoDb();
});




/**
* Calculates calibrated value
* @param {*} value Raw value
* @param {*} calibration Params Object for particular
* @returns calibrated value

const calibrateValue = (value, calibration = {}) => {
    try {
        if (calibration['m'] != undefined) {
            // y = mx + c
            value = (value * parseFloat(calibration['m'])) + parseFloat(calibration['c']);
 
            if (calibration['min'] != undefined && value < calibration['min'])
                return parseFloat(calibration['min']);
            if (calibration['max'] != undefined && value > calibration['max'])
                return parseFloat(calibration['max']);
            return value;
        } else
            return value;
    } catch (error) {
        console.log('Calibrate Error', error);
    }
};

*/


/**
* userDeviceSensorMetadata
* @param {devID, sensor, added_by} param0 device sensor userID
* @returns Params, unit, unitSelected of the sensor in device

 
const userDeviceSensorMetadata = async ({ devID, sensor, added_by }) => {
    try {
        const { UserDevice } = require('../../app').db.models;
        let userDev = await UserDevice.findOne(
            { devID, added_by },
            'tags params unit unitSelected'
        );
 
        // if (!userDev)
        //     throw `User has no such device ${devID}`;
 
        const returnObj = {
            tags: userDev ? userDev.tags : [],
            params: {},
            unit: userDev && userDev.unit ? userDev.unit[sensor] : null,
            unitSelected: userDev && userDev.unitSelected ? userDev.unitSelected[sensor] : null
        };
 
        if (userDev && userDev.params[sensor])
            for (const { paramName, paramValue } of userDev.params[sensor])
                returnObj['params'][paramName] = paramValue;
        else
            console.log(`${devID}: params[${sensor}] not found`);
 
        return returnObj;
    } catch (error) {
        console.log(`userDeviceSensorMetadata Error - ${error}`);
        return Promise.reject(error);
    }
};

*/