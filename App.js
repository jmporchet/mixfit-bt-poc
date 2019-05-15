import React, { Component } from 'react';
import { Platform, View, Text } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

export default class SensorsComponent extends Component {

  constructor() {
    super()
    this.manager = new BleManager()
    this.state = {info: "", values: {}, uuidList: [], device: null}
    this.sensors = []
  }

  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }

  updateValue(key, value) {
    this.setState({values: {...this.state.values, [key]: value}})
  }

  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.scanAndConnect()
      })
    } else {
      this.scanAndConnect()
    }
  }

  listenerFunction = async (error, device) => {
    this.info("Scanning...")
    // if (device.name && device.name.indexOf('MacBook Pro') === -1) {
      console.log(device)
    // }

    if (error) {
      this.error(error.message)
      return
    }

    if (device.localName === 'CC2650 SensorTag') {
      this.info("CC2650 SensorTag")
      this.setState({device});
      console.log('Connecting to CC2650 SensorTag...');
      this.manager.stopDeviceScan()
      console.log('stopDeviceScan: ');
      const deviceInfo = await device.connect();
      console.log('device.connect: ', deviceInfo);
      await device.discoverAllServicesAndCharacteristics();
      const services = await device.services()
      console.log('device.services: ', services);
      const characteristics = await this.manager.characteristicsForDevice("337C0420-AB8F-2965-E66A-37DDDC6EB2C0", "0000180f-0000-1000-8000-00805f9b34fb")
      console.log('characteristics: ', characteristics);
      services.map(service => this.setState(prev => ({uuidList: [...prev.uuidList, service] })));
      // for (i = 8; i < services.length; i++) {
      //   console.log('service', i);
      //   console.log('device.id: ', device.id);
      //   console.log('services[i].uuid: ', services[i].uuid);
      //   console.log(await this.manager.characteristicsForDevice(device.id, services[i].uuid));
      // }
      services.map(async (service) => console.log('device.characteristics: ', await this.manager.characteristicsForDevice(device.id, service.uuid)))
      // this.setupNotifications(device)
      console.log('notifs');
    }
  }

  scanAndConnect() {
    this.manager.startDeviceScan(null, null, this.listenerFunction);
  }

  async setupNotifications(device) {
    
    for (const id in this.state.uuidList) {
      const service = this.serviceUUID(id)
      const characteristicW = this.writeUUID(id)
      const characteristicN = this.notifyUUID(id)

      const characteristic = await device.writeCharacteristicWithResponseForService(
        service, characteristicW, "AQ==" /* 0x01 in hex */
      )

      device.monitorCharacteristicForService(service, characteristicN, (error, characteristic) => {
        if (error) {
          this.error(error.message)
          return
        }
        this.updateValue(characteristic.uuid, characteristic.value)
      })
    }
  }

  render() {
    return (
      <View style={{marginTop: 50}}>
        <Text>{this.state.info}</Text>
        {Object.keys(this.sensors).map((key) => {
          return <Text key={key}>
                   {this.sensors[key] + ": " + (this.state.values[this.notifyUUID(key)] || "-")}
                 </Text>
        })}
      </View>
    )
  }
}