const express = require('express');
const mongoose = require('mongoose');
const app = express();
const Influx = require('influx');
const deviceData = require('./INEM_DEMO_DEVICE_DATA.json');
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

const influx = new Influx.InfluxDB({
    'hostname': 'localhost',
    'database': 'deviceDb',
    'schema': [{
        'measurement': deviceData.devID,
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

                    let m;
                    let c;
                    let min;
                    let max;
                    let y;

                    // extract value of each parameter from current sensor parameters
                    sensorParams.forEach(param => {
                        if (param.paramName === 'm') m = param.paramValue * 1;
                        else if (param.paramName === 'c') c = param.paramValue * 1;
                        else if (param.paramName === 'min') min = param.paramValue * 1;
                        else if (param.paramName === 'max') max = param.paramValue * 1;
                    })

                    // get the raw value of the sensor fetched from influxDb
                    const x = sensorData.latest_value;

                    // if value of m and c is not undefined, then calibrate it
                    if (m != undefined && c != undefined) {
                        y = m * x + c;
                        y = (y > max) ? max : (y < min) ? min : y;

                        calibratedDeviceData.push({
                            'sensor': sensorData.sensor,
                            'value': y,
                            'unit': deviceData.unitSelected[sensorData.sensor]
                        })
                    }
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





// result.forEach(sensorItem => {
            //     if (userDevice.unitSelected[sensorItem.sensor]) {
            //         if (userDevice.params[sensorItem.sensor]) {
            //             const m = userDevice.params[sensorItem.sensor]?.filter(param => param.paramName == 'm')[0].paramValue
            //             const c = userDevice.params[sensorItem.sensor]?.filter(param => param.paramName == 'c')[0].paramValue
            //             const min = userDevice.params[sensorItem.sensor]?.filter(param => param.paramName == 'min')[0].paramValue
            //             const max = userDevice.params[sensorItem.sensor]?.filter(param => param.paramName == 'max')[0].paramValue
            //             const x = sensorItem.last_value
            //             let y = (Number(m) * Number(x)) + Number(c)
            //             y < min ? y = min : y > max ? y = max : y
            //             const calibratedItem = {
            //                 sensor: sensorItem.sensor,
            //                 value: `${y} ${userDevice.unitSelected[sensorItem.sensor]}`
            //             }

            //             calibratedResult.push(calibratedItem)
            //         }
            //     }
            // })