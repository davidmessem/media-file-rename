#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { getVideoDurationInSeconds } = require('get-video-duration')

const fileExtension = process.argv[2]
const prepend = process.argv[3]
const directoryPath = process.argv[4]

if (!fileExtension || !prepend || !path) {
  console.error("Usage: node index.js <file extension> <prepend> <path>");
  console.error("Example: node index.js mp4 bike_ride ~/videos");
  process.exit(1);
}

fs.promises
  .readdir(directoryPath, { withFileTypes: true })
  .then(directoryEntries =>
    directoryEntries
      .filter(entry => entry.isFile())
      .filter(entry => entry.name.toLowerCase().endsWith(fileExtension.toLowerCase()))
      .map(entry => entry.name)
  )
  .then(fileNames =>
    Promise.all(
      fileNames.map(fileName =>
        fs.promises.stat(directoryPath + "/" + fileName)
          .then(stats => {
            return {
              name: fileName,
              path: directoryPath,
              birthTime: stats.birthtime,
              extension: path.extname(fileName)
            }
          })
      )
    )
  )
  .then(filesStatInfo =>
    Promise.all(filesStatInfo.map(fileStatInfo =>
      getVideoDurationInSeconds(fileStatInfo.path + "/" + fileStatInfo.name)
        .then(durationSeconds => {
          return {
            ...fileStatInfo,
            duration: secondsToString(durationSeconds)
          }
        })
    ))
  )
  .then(videosInfo => {
    return Promise.all(
      videosInfo.map(videoInfo => {
        const dateTime = moment(videoInfo.birthTime).format('YYYY-MM-DD__HH[H]mm');
        const newName = `${prepend}___${dateTime}___${videoInfo.duration}${videoInfo.extension}`
        console.log(`${videoInfo.name} -> ${newName}`)
        return fs.promises.rename(`${videoInfo.path}/${videoInfo.name}`, `${videoInfo.path}/${newName}`)
      })
    )
  })
  .then(() => console.log("Done"))

function secondsToString(seconds) {
  var numHours = Math.floor(((seconds % 31536000) % 86400) / 3600);
  var numMinutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
  var numSeconds = Math.floor((((seconds % 31536000) % 86400) % 3600) % 60);
  return (numHours ? numHours + "h" : "")
    + (numMinutes ? numMinutes + "m" : "")
    + (numSeconds ? numSeconds + "s" : "");
}