const Redis = require('ioredis');
const redisClient = new Redis();
const mqtt = require('mqtt');
const { storeDataToInfluxDb } = require('./storeData');

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

let dataReceivedFlag = false;

const timeout = 2000;

let packetCount = 0;

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
                        await redisClient.hmset(`${payloadData.device}:timeout`, { 'timeout': timeout });

                        // set the lastTimestamp of device data received to the redis hashmap
                        await redisClient.hmset(`${payloadData.device}:lastTimestamp`, { 'lastTimestamp': payloadData.time });

                        // store data in influxDb
                        await storeDataToInfluxDb(payloadData);

                        // increase the packet count
                        packetCount++;

                        // invoking timer function
                        invokeTimer(payloadData.time)

                    } else {

                        // fetching device timeout time
                        const deviceTimeout = await redisClient.hmget(`${payloadData.device}:timeout`, 'timeout');

                        // fetching device last timestamp from redis hashmap
                        const lastTimestamp = await redisClient.hmget(`${payloadData.device}:lastTimestamp`, 'lastTimestamp');

                        // current datapacket timestamp
                        const currentTime = payloadData.time;

                        // checking if data packet received is within device timeout time 
                        if (Math.abs(currentTime - lastTimestamp) <= deviceTimeout) {

                            // marking dataReceived flag as true
                            dataReceivedFlag = true;

                            // update data in redis hashset with new timestamp
                            await redisClient.hmset(`${payloadData.device}:lastTimestamp`, { 'lastTimestamp': currentTime })

                            // send data packet to influxDb
                            await storeDataToInfluxDb(payloadData);
                        } 
                        
                        // else {
                        //     // send data packet with RSSI:-1
                        //     console.log('Device inactive');
                        //     const dataPacket = {
                        //         device: devID,
                        //         time: currentTime,
                        //         data: [{
                        //             tag: 'RSSI',
                        //             value: -1
                        //         }]
                        //     }

                        //     await storeDataToInfluxDb(dataPacket);
                        // }
                    }
                })
            }
        });
    } catch (error) {
        console.log('Some error occured, server error', error);
    }
}

// this function keeps a check if data packet if received within the timeout time
// if not received it sends a data packet with {RSSI:-1}
const invokeTimer = (currentTime) => {
    return setTimeout(() => {
        // checks if data was received
        if (dataReceivedFlag===false) {
            console.log('Device inactive');

            // make a data packet with RSSI:1
            const dataPacket = {
                device: devID,
                time: currentTime,
                data: [{
                    tag: 'RSSI',
                    value: -1
                }]
            }

            // send the data packet to influxDb
            storeDataToInfluxDb(dataPacket);
        }

        // invoke the timer function again
        invokeTimer(Date.now());
    }, timeout);
}

subscribeToDevice();

