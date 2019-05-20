import {Buffer} from 'buffer';
import React, { Component } from 'react';
import { Platform, View, Text } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const deviceId = "337C0420-AB8F-2965-E66A-37DDDC6EB2C0";
const tempServiceId = "F000AA00-0451-4000-B000-000000000000";
const writeChar = "F000AA02-0451-4000-B000-000000000000";
const readChar = "F000AA01-0451-4000-B000-000000000000";

const drinkServiceUUID = '125A7D72-9012-421A-AF95-BD6E53B7DD67';
const makeDrinkCharUUID = '125A7D73-9012-421A-AF95-BD6E53B7DD67';
const deviceStatusServiceUUID = '10041AE3-17A2-4025-8DB0-00F6AD986120';
const deviceStatusCharUUID = '10041AE4-17A2-4025-8DB0-00F6AD986120';
const recipeCompletionPercentageCharUUID = '10041AE5-17A2-4025-8DB0-00F6AD986120';

export default class SensorsComponent extends Component {

  constructor() {
    super();
    this.manager = new BleManager();
    this.state = {info: []};
  }

  info(message) {
    this.setState(prevState => ({info: [...prevState.info, message ]}));
  }

  error(message) {
    this.setState(prevState => ({ info: [...prevState.info, "ERROR: " + message ]}));
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
      this.info("Scanning device...");
      console.log('Scanning device: ', device. name, device.localName);
  
      if (error) {
        this.error(error.message);
        return
      }
  
      if (device.localName === 'Mixfit One') {
        this.info("Mixfit One");
        this.setState({ device });
        this.info('Connecting to Mixfit One...');

        this.manager.stopDeviceScan();
        this.info('stopping Device scan');

        const deviceInfo = await device.connect();
        this.info('the Mixfit One is connected');
        console.log('deviceInfo: ', deviceInfo);
        
        // this is mandatory even if we already know the service/char UUIDs
        await device.discoverAllServicesAndCharacteristics();
        const services = await device.services();
        this.info('services have been discovered');
        console.log('services: ', services);
        
        const characteristics = await this.manager.characteristicsForDevice(device.id, drinkServiceUUID);
        this.info('characteristics for the drink service have been discovered');
        console.log('characteristics for the drink service: ', characteristics);
        
        const characteristic = await device.writeCharacteristicWithResponseForService(drinkServiceUUID, makeDrinkCharUUID, "AQ==" /* 0x01 in hex */);
        this.info('Sent drink request');
        console.log('characteristic: ', characteristic);
        
        // not yet implemented
        // this.manager.monitorCharacteristicForDevice(device.id, deviceStatusServiceUUID, deviceStatusCharUUID, async (err, characteristic) => {
        //   debugger;
        //   if (err) { 
        //     console.log('error in monitor', err);

        //     await this.manager.cancelDeviceConnection(device.id);
        //     this.info('Disconnected successfully from Mixfit One');
        //     return;
        //   }
        //   // the data format is stored as 16 bit unsigned integer, we need to convert it
        //   const currentTemp = Buffer.from(characteristic.value, 'base64').readUInt16LE(0) / 128;
        //   this.info('current temperature ' + currentTemp);
        // })
        await this.manager.cancelDeviceConnection(device.id).catch(err => { console.log('caught', err)});
        this.info('Disconnected successfully from Mixfit One');
      }
    });
  }

  render() {
    return (
      <View style={{margin: 50}}>
        {this.state.info.map((line, idx) => <Text key={idx}>{line}</Text>)}
      </View>
    )
  }
}