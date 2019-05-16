/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import { StyleSheet, Text, View, Alert, PermissionsAndroid, AppState } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SmsAndroid from 'react-native-sms-android';
import BackgroundJob from "react-native-background-job";
import SocketIOClient from 'socket.io-client';
import { ENDPOINT, JOB_KEY, JOB_DEFAULT_SETTINGS } from './constants';

let socket = null;
let isGranted = false;

// register background service
BackgroundJob.setGlobalWarnings(false);
BackgroundJob.register({
  jobKey: JOB_KEY,
  job: () => {
    if (isGranted && socket && socket.disconnected) {
      socket.connect();
    }
  }
});

export default class App extends Component {

  state = {
    isAppActive: this.getAppIsActive(),
    isGranted,
    connected: false,
    deviceId: DeviceInfo.getUniqueID()
  };

  restrictedMessage = `Permission to send SMS has been denied`;

  handleAppStateChange = nextAppState => this.setState({ isAppActive: this.getAppIsActive(nextAppState) });

  componentDidMount() {

    BackgroundJob.schedule(JOB_DEFAULT_SETTINGS);

    AppState.addEventListener('change', this.handleAppStateChange);
  
    socket = SocketIOClient(ENDPOINT, {
      query: this.queryParams,
      autoConnect: false,
      transports: ['websocket']
    });

    socket.on('reconnect_attempt', () => {
      socket.io.opts.query = this.queryParams;
    });

    socket.on('disconnect', () => {

      this.setState({ connected: false });
      if (isGranted) {
        socket.connect();
      }
  
    });

    socket.on('connect', () => this.setState({ connected: true }));

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

    this.handlePermission();

  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  get host() {
    return ENDPOINT.split('://').slice(-1)[0];
  }

  get queryParams() {
    return {
      id: this.state.deviceId
    };
  }

  getAppIsActive(currentState = AppState.currentState) {
    return currentState === 'active';
  }

  showAlert(topic, message) {
    Alert.alert(topic, message);
  }

  async handlePermission(permission = PermissionsAndroid.PERMISSIONS.SEND_SMS) {

    try {

      isGranted = await PermissionsAndroid.check(permission);
      if (!isGranted) {

        isGranted = PermissionsAndroid.RESULTS.GRANTED === (await PermissionsAndroid.request(permission));
  
        if (!isGranted) {

          if (socket.connected) {
            socket.disconnect();
          }
    
          setTimeout(() => this.handlePermission(), 1000);

        }else if (socket.disconnected) {

          socket.connect();

        }

      }else {

        socket.open();

      }

      this.setState({ isGranted });

    }catch(err) {

      if (this.state.isAppActive) {
        this.showAlert(
          err.name,
          err.message
        );
      }

    }

  }

  async sendSMS({ n, m }) {
 
    try {

      if (isGranted) {
  
        SmsAndroid.sms(
          n,
          m,
          'sendDirect',
          (err, message) => {

            if (!this.state.isAppActive) {
              return;
            }

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
    
      }
  
    }catch(err) {
      
      this.state.isAppActive &&
      this.showAlert(
        'Error occured with permissions', 
        `Error name => ${err.name}
         Error message => ${err.message}`
      );
  
    }
    
  }

  render() {
    const { connected, deviceId, isGranted } = this.state;
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
        {
          connected 
            ? (isGranted ? `Device ${deviceId} connected to socket`: this.restrictedMessage) 
            : (isGranted ? 'Not connected to socket' : this.restrictedMessage)
        }
        </Text>
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
