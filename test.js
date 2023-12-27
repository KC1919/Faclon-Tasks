
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