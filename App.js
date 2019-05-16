import {Buffer} from 'buffer';
import React, { Component } from 'react';
import { Platform, View, Text } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const deviceId = "337C0420-AB8F-2965-E66A-37DDDC6EB2C0";
const tempServiceId = "F000AA00-0451-4000-B000-000000000000";
const writeChar = "F000AA02-0451-4000-B000-000000000000";
const readChar = "F000AA01-0451-4000-B000-000000000000";


export default class SensorsComponent extends Component {

  constructor() {
    super();
    this.manager = new BleManager();
    this.state = {info: ""};
  }

  info(message) {
    this.setState({info: message});
  }

  error(message) {
    this.setState({ info: "ERROR: " + message });
  }

  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.scanAndConnect();
      })
    } else {
      this.scanAndConnect();
    }
  }

  scanAndConnect() {
    this.manager.startDeviceScan(null, null, async (error, device) => {
      this.info("Scanning...");
  
      if (error) {
        this.error(error.message);
        return
      }
  
      if (device.localName === 'CC2650 SensorTag') {
        this.info("CC2650 SensorTag");
        this.setState({ device });
        this.info('Connecting to CC2650 SensorTag...');

        this.manager.stopDeviceScan();
        this.info('stopping Device scan');

        const deviceInfo = await device.connect();
        this.info('the SensorTag is connected');
        console.log('deviceInfo: ', deviceInfo);
        
        // this is mandatory even if we already know the service/char UUIDs
        await device.discoverAllServicesAndCharacteristics();
        const services = await device.services();
        this.info('services have been discovered');
        console.log('services: ', services);
        
        const characteristics = await this.manager.characteristicsForDevice(deviceId, tempServiceId);
        this.info('characteristics for the temperature service have been discovered');
        console.log('characteristics for the temperature service: ', characteristics);
        
        const characteristic = await device.writeCharacteristicWithResponseForService(tempServiceId, writeChar, "AQ==" /* 0x01 in hex */);
        this.info('R/W mode enabled');
        console.log('characteristic: ', characteristic);
        
        this.manager.monitorCharacteristicForDevice(deviceId, tempServiceId, readChar, (err, characteristic) => {
          if (err) { 
            console.log('error', err);
            return;
          }
          // the data format is stored as 16 bit unsigned integer, we need to convert it
          const currentTemp = Buffer.from(characteristic.value, 'base64').readUInt16LE(0) / 128;
          this.info('current temperature ' + currentTemp);
        })
      }
    });
  }

  render() {
    return (
      <View style={{margin: 50}}>
        <Text>{this.state.info}</Text>
      </View>
    )
  }
}