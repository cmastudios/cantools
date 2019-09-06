let can = require("./index");

let dbc = can.database.load_file("./CANBus19.dbc");



let test1 = {id: parseInt("01f0a003", 16), data: Buffer.from("bb0000000700d0f3", "hex")};

let parsed = dbc.decode_message(test1.id, test1.data);
let expected = {AFR1:	18.026449,
    VehicleSpeed:	0,
    GearPosCalculated:	7,
    IgnitionTiming:	-17,
    ECUBatteryVoltage:	13.1320405};

// console.log(parsed);
// console.log(expected);

for (let key of Object.keys(expected)) {
    if (Math.floor(parsed[key] * 10000) != Math.floor(expected[key] * 10000)) {
        console.error("Incorrect value found in decoding")
    }
}


console.log("End of test")
