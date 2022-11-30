import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { RNCamera } from 'react-native-camera';
import Assets from './src/utils/assets';
import moment from 'moment';
import ImgToBase64 from 'react-native-image-base64';
import ImageResizer from 'react-native-image-resizer';
import axios from 'axios';


const widthDevice = Dimensions.get('window').width;
const heightDevice = Dimensions.get('window').height;
let interval = null;

export default function App() {
  const numberImageVerify = 1;
  let flag = null;
  const [cameraViewSize, setCameraViewSize] = useState(null);
  const cameraRef = useRef(null);
  const [faceDetectionEnabled, setEnableFace] = useState(false);
  const [faces, setFaces] = useState([]);
  const [imgBase64, setImgBase64] = useState(null);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const checkPointInsideRectange = (pointCheck) => {
    let rightCamera = {
      x: cameraViewSize.x + cameraViewSize.width,
      y: cameraViewSize.y + cameraViewSize.height - (cameraViewSize.width / 10)
    }

    let leftCamera = {
      x: cameraViewSize.x,
      y: cameraViewSize.y + (cameraViewSize.width / 10)
    }

    let conditionOne = (pointCheck.x - leftCamera.x) / (rightCamera.x - leftCamera.x) >= 0 && (pointCheck.x - leftCamera.x) / (rightCamera.x - leftCamera.x) <= 1
    let conditionTwo = (pointCheck.y - leftCamera.y) / (rightCamera.y - leftCamera.y) >= 0 && (pointCheck.y - leftCamera.y) / (rightCamera.y - leftCamera.y) <= 1

    if (conditionOne && conditionTwo) {
      return true
    } else {
      return false
    }
  }

  const checkFaceInsideCamera = (faceIdPosition) => {

    let rightFace = {
      x: faceIdPosition.origin.x + faceIdPosition.size.width,
      y: faceIdPosition.origin.y + faceIdPosition.size.height
    }

    let leftFace = {
      x: faceIdPosition.origin.x,
      y: faceIdPosition.origin.y
    }

    let topFace = {
      x: faceIdPosition.origin.x + faceIdPosition.size.width,
      y: faceIdPosition.origin.y
    }

    let bottomFace = {
      x: faceIdPosition.origin.x,
      y: faceIdPosition.origin.y + faceIdPosition.size.height
    }

    if (checkPointInsideRectange(rightFace) && checkPointInsideRectange(leftFace) && checkPointInsideRectange(topFace) && checkPointInsideRectange(bottomFace)) {
      return true
    } else {
      return false
    }

  }

  const onFacesDetected = ({ faces }) => {
    setFaces(faces)
    if (!flag && faces?.length == 1) {
      flag = new Date();
    }
    if (flag && (new Date()).getTime() - flag.getTime() < 200) {
      return;
    }
    if (faces?.length === 1 && checkFaceInsideCamera(faces[0].bounds)) {
      takePicture()
      setEnableFace(false)
    } else {
      // show warning detect facial
    }

  }
  const takePicture = async () => {
    let arrayImage = [];

    if (interval) {
      clearInterval(interval)
    }
    const options = { quality: 1, base64: true, width: widthDevice * 0.9 };
    interval = setInterval(async function () {
      if (!imgBase64) {

        let data = await cameraRef.current.takePictureAsync(options);
        setImgBase64(data.base64)

        let reSizeImage = await ImageResizer.createResizedImage(data.uri, 256, 256, "JPEG", 100, 0);
        let base64String = await ImgToBase64.getBase64String(reSizeImage.uri)
        arrayImage.push(base64String)
      }
      const timeVerify = Date.now() / 1000;
      if (arrayImage.length == numberImageVerify) {
        let currentDateTime = getLocalTime();
        clearInterval(interval)
        // set image random
        setLoadingVerify(true)
        // call API verify
        const data = {
          "imgs": arrayImage,
          "timeVerify": timeVerify,
          "secondsTime": timeVerify
        };
        const response = axios.post("/facial-recognition/verify", data);
        console.log('response', response);
      }
    }, 1000)
  }

  const renderFaces = () => (
    <View style={{
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
      top: 0,
    }} pointerEvents="none">
      {faces.map(renderFace)}
    </View>
  );

  const renderFace = ({ bounds, faceID, rollAngle, yawAngle }) => (
    <View
      key={faceID}
      style={[
        {
          transform: [
            { perspective: 600 },
          ]
        },
        {
          ...bounds.size,
          left: bounds.origin.x,
          top: bounds.origin.y,
        },
      ]}
    >
      <Image source={Assets.Images.imageDetextFace3} style={{ width: '100%', height: '100%', resizeMode: "contain" }} />
    </View>
  );

  const getLocalTime = () => {
    return moment().format('YYYY-MM-DDTHH:mm:ss');
  }


  return (
    <View style={styles.container}>
      <View style={styles.containerForm}>
        <Text style={styles.textNoteStyle}>{'Look at me'}</Text>
        <View style={styles.cameraContainer}>
          <RNCamera
            onLayout={event => {
              const layout = event.nativeEvent.layout;
              setCameraViewSize(layout)
            }}
            ref={cameraRef}
            onCameraReady={() => setEnableFace(true)}
            trackingEnabled
            playSoundOnCapture={false}
            faceDetectionMode={RNCamera.Constants.FaceDetection.Mode.accurate}
            captureAudio={false}
            ratio={'1:1'}
            type={RNCamera.Constants.Type.front}
            flashMode={RNCamera.Constants.FlashMode.off}
            style={styles.preview}
            onFacesDetected={faceDetectionEnabled ? onFacesDetected : undefined}
            faceDetectionLandmarks={
              RNCamera.Constants.FaceDetection.Landmarks
                ? RNCamera.Constants.FaceDetection.Landmarks.all
                : undefined
            }>
            {!!faceDetectionEnabled && renderFaces()}
          </RNCamera>
        </View>
        <View style={styles.actionContainer}>
          <TouchableOpacity style={{ marginRight: 10 }}>
            <Image source={Assets.Images.facialIdWhiteIcon} style={{ width: 70, height: 70 }} />
          </TouchableOpacity>

          <TouchableOpacity style={{ marginLeft: 10 }}>
            <Image source={Assets.Images.facialIdGreenIcon} style={{ width: 70, height: 70 }} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerForm: {
    flex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  textNoteStyle: {
    marginVertical: 10,
    fontSize: 15,
    color: '#FFFFFF',
    height: 20,
    flex: 1,
  },
  cameraContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 5,
    overflow: 'hidden',
    flex: 15
  },
  preview: {
    width: 0.9 * widthDevice,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    minHeight: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
