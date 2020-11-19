const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = {};
            data.statusCode = response.statusCode;
            data.body = [];
            response.on('data', (chunk) => data.body.push(chunk));
            response.on('end', () => {
                data.body = data.body.join('');
                resolve(data);
            });
        })
            .on('error', (error) => reject(error));
    });
}

function getPlaylistURL(id, accessToken, vod) {
  return new Promise(resolve => {
    resolve(`https://usher.ttvnw.net/${vod ? 'vod' : 'api/channel/hls'}/${id}.m3u8?client_id=${clientId}&token=${accessToken.token}&sig=${accessToken.sig}&allow_source&allow_audio_only`);
  });
}

function getAccessToken(id, vod) {
    return new Promise((resolve, reject) => {
        get(`https://api.twitch.tv/api/${vod ? 'vods' : 'channels'}/${id}/access_token?client_id=${clientId}`)
            .then((data) => {
                if (data.statusCode != 200) {
                    reject(new Error(`${JSON.parse(data.body).message}`));
                } else {
                    resolve(JSON.parse(data.body));
                }
            })
            .catch((error) => reject(error));
    });
}

function getPlaylist(url) {
    return new Promise((resolve, reject) => {
        get(url)
            .then((data) => {
                switch (data.statusCode) {
                    case 200:
                        resolve(resolve(data.body));
                        break;
                    case 404:
                        reject(new Error('Transcode does not exist - the stream is probably offline'));
                        break;
                    default:
                        reject(new Error(`Twitch returned status code ${data.statusCode}`));
                        break;
                }
            })
            .catch((error) => reject(error));
    });
}

function parsePlaylist(playlist) {
    const parsedPlaylist = [];
    const lines = playlist.split('\n');
    for (let i = 4; i < lines.length - 1; i += 3) {
        parsedPlaylist.push({
            quality: lines[i - 2].split('NAME="')[1].split('"')[0],
            resolution: (lines[i - 1].indexOf('RESOLUTION') != -1 ? lines[i - 1].split('RESOLUTION=')[1].split(',')[0] : null),
            url: lines[i]
        });
    }
    return parsedPlaylist;
}

function getURL(id, vod) {
  return new Promise(resolve => {
    getAccessToken(id, vod)
      .then((accessToken) => resolve(getPlaylistURL(id, accessToken, vod)))
      .catch(error => reject(error));
  });
}

function getStream(channel, raw) {
    return new Promise((resolve, reject) => {
        getURL(channel, false)
            .then((url) => getPlaylist(url))
            .then((playlist) => resolve((raw ? playlist : parsePlaylist(playlist))))
            .catch(error => reject(error));
    });
}

function getVod(vid, raw) {
    return new Promise((resolve, reject) => {
        getURL(vid, true)
            .then((url) => getPlaylist(url))
            .then((playlist) => resolve((raw ? playlist : parsePlaylist(playlist))))
            .catch(error => reject(error));
    });
}

module.exports = function (cid) {
    clientId = cid;
    return {
        getStream: getStream,
        getVod: getVod,
        getURL: getURL
    };
};
