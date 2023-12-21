const Redis = require('ioredis');
const redisClient = new Redis();
const mqtt = require('mqtt');
const { storeDataToInfluxDb } = require('./storeData');
const express = require('express');

const app = express();

app.use(express.json());

const mqttConfig = {
    username: 'emqx',
    password: 'public',
    qos: 2,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    clean: true
}

const devID = 'INEM_DEMO';
const topic = `devicesIn/${devID}/data`;

const host = 'broker.emqx.io';
const port = 1883;

const connectURL = `mqtt://${host}:${port}`;

const mqttClient = mqtt.connect(connectURL, mqttConfig);

// let dataReceivedFlag = false;

let timeout = 5000;

let packetCount = 0;


app.post('/setConnectionTimeoutInMilliseconds', async (req, res) => {
    try {

        // go through express-validators 
        const device = req.body.device;
        const deviceConnTimeout = req.body.timeout * 1;

        if (device === null || deviceConnTimeout === null) {
            return res.status(400).json({ message: 'Plase provide device name and timeout period in milliseconds!' });
        }

        timeout = deviceConnTimeout;

        await redisClient.hset('timeout', devID, deviceConnTimeout);

        return res.status(201).json({ message: 'Updated device connection timeout!', status: 'success' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to set connection timeout, server error', error: error.message })
    }
})

const subscribeToDevice = async () => {
    try {
        mqttClient.subscribe([topic], err => {
            if (err) {
                console.log(`Failed to subscribe to topic: ${topic}`, err);
            }
            else {
                console.log(`Client subscribed to topic: ${topic}`);

                // listening for incoming messages
                mqttClient.on('message', async (topic, payload) => {

                    console.log(`Received data packet from topic:${topic}`);

                    // parsing data packet received
                    const payloadData = JSON.parse(payload);

                    // checking if it is the 1st data packet
                    if (packetCount === 0) {

                        // set the timeout for the device in redis hashmap
                        await redisClient.hset('timeout', payloadData.device, timeout);

                        const deviceData = JSON.stringify({ 'lastTimestamp': payloadData.time, 'deviceStatus': 1 });

                        // set the lastTimestamp of device data received to the redis hashmap
                        await redisClient.hset('lastTimestamp', payloadData.device, deviceData);

                        // store data in influxDb
                        await storeDataToInfluxDb(payloadData);

                        // increase the packet count
                        packetCount++;

                    } else {

                        // fetching device timeout time
                        const deviceTimeout = await redisClient.hget('timeout', payloadData.device);

                        console.log(deviceTimeout);

                        // fetching device last timestamp from redis hashmap
                        let deviceData = await redisClient.hget('lastTimestamp', payloadData.device);

                        deviceData = JSON.parse(deviceData);

                        const lastTimestamp = deviceData.lastTimestamp;
                        const deviceStatus = deviceData.deviceStatus;

                        // current datapacket timestamp
                        const currentTime = payloadData.time;

                        // check if device was inactive, then change the status to active
                        if (deviceStatus === 0) {
                            // update data in redis hashset with new timestamp and mark device as active
                            await redisClient.hset('lastTimestamp', payloadData.device, JSON.stringify({ 'lastTimestamp': currentTime, 'deviceStatus': 1 }));
                            await storeDataToInfluxDb(payloadData);
                        }

                        else {
                            // else if the device is active then check if data packet received is within device timeout time 
                            if (Math.abs(currentTime - lastTimestamp) <= deviceTimeout) {

                                // update data in redis hashset with new timestamp and mark device as active
                                await redisClient.hset('lastTimestamp', payloadData.device, JSON.stringify({ 'lastTimestamp': currentTime, 'deviceStatus': 1 }));

                                // send data packet to influxDb
                                await storeDataToInfluxDb(payloadData);
                            }

                            else {

                                // if the device is active then set it to inactive and send RSSI:-1
                                await redisClient.hset('lastTimestamp', payloadData.device, JSON.stringify({ 'lastTimestamp': lastTimestamp, 'deviceStatus': 0 }));
                                // make a data packet with RSSI:1
                                const dataPacket = {
                                    device: payloadData.device,
                                    time: Date.now(),
                                    data: [{
                                        tag: 'RSSI',
                                        value: -1
                                    }]
                                }

                                // send the data packet to influxDb
                                await storeDataToInfluxDb(dataPacket);

                            }
                        }
                    }
                })
            }
        });
    } catch (error) {
        console.log('Some error occured, server error', error);
    }
}

setInterval(async () => {
    let deviceData = await redisClient.hget('lastTimestamp', devID);
    deviceData = JSON.parse(deviceData);

    const lastTimestamp = deviceData.lastTimestamp;
    const deviceStatus = deviceData.deviceStatus;
    const deviceTimeout = await redisClient.hget('timeout', devID);

    const current_time = Date.now();
    const timeDiff = Math.abs(current_time - lastTimestamp);

    // checks if data was received
    if (timeDiff >= deviceTimeout) {
        console.log('Device inactive');

        if (deviceStatus === 1) {

            // mark deviceStatus as inactive

            await redisClient.hset('lastTimestamp', devID, JSON.stringify({ 'lastTimestamp': lastTimestamp, 'deviceStatus': 0 }));

            // make a data packet with RSSI:1
            const dataPacket = {
                device: devID,
                time: current_time,
                data: [{
                    tag: 'RSSI',
                    value: -1
                }]
            }

            // send the data packet to influxDb
            await storeDataToInfluxDb(dataPacket);
        }
    }
}, 6000);

app.listen(3000, () => {
    console.log('Server running on port:3000');
    subscribeToDevice();
    // checkLastTimestamp();
});

