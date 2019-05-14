/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import { StyleSheet, Text, View, Alert, PermissionsAndroid, ToastAndroid } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SmsAndroid from 'react-native-sms-android';
import SocketIOClient from 'socket.io-client';
import { ENDPOINT } from './constants';

// const instructions = Platform.select({
//   ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
//   android:
//     'Double tap R on your keyboard to reload,\n' +
//     'Shake or press menu button for dev menu',
// });

export default class App extends Component {

  state = {
    socketId: null,
    deviceId: DeviceInfo.getUniqueID()
  };

  socket = null;

  componentDidMount() {
    const socket = SocketIOClient(ENDPOINT, {
      query: this.queryParams,
      transports: ['websocket']
    });

    socket.on('reconnect_attempt', () => {
      socket.io.opts.query = this.queryParams;
    });

    socket.on('error', error => {
      this.showAlert(error.name, JSON.stringify(err));
    });

    socket.on('disconnect', () => this.setState({ socketId: null }));

    socket.on('connect', () => {

      this.setState({ socketId: socket.id });

      this.showAlert(
        'Socket connected',
        `Websocket been connected to ${this.host}`
      );

      socket.on('message', ({ n = '', m = '' } = {}) => {
        // this.showAlert(
        //   'Socket message received',
        //   `Websocket received message from host ${this.host}:
        //     n -> ${n}
        //     m -> ${m}
        //   `
        // );
        this.sendSMS({ n, m });

      });

    });

    this.socket = socket;

  }

  componentWillUnmount() {
    this.socket.close();
  }

  get host() {
    return ENDPOINT.split('://').slice(-1)[0];
  }

  get queryParams() {
    return {
      id: this.state.deviceId
    };
  }

  showAlert(topic, message) {
    Alert.alert(topic, message);
  }

  async sendSMS({ n, m }) {
    // ToastAndroid.show(m, ToastAndroid.SHORT);
    const send = () => {
      SmsAndroid.sms(
        n,
        m,
        'sendDirect',
        (err, message) => {
          if (err) {
            this.showAlert(
              'Error occured while sending message',
              `Error name => ${err.name}
               Error message => ${err.message}
              `
            );
          } else {
            this.showAlert(
              'Result From Callback',
              `Message => ${message}`
            );
          }
        }
      );
    };
 
    try {

      const canSendSMS = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
      if (canSendSMS) {
        return send();
      }

      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return send();
      }

      this.showAlert(
        'Result from request permission', 
        'Permissions to send SMS been denied'
      );
  
    }catch(err) {
  
      this.showAlert(
        'Error occured with permissions', 
        `Error name => ${err.name}
         Error message => ${err.message}`
      );
  
    }
    
  }

  render() {
    const { socketId, deviceId } = this.state;
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>{socketId ? `Device ${deviceId} connected to socket with ID ${socketId}` : `Not connected to socket`}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
