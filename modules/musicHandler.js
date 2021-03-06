const { ytAPIKey } = require('../resources/settings.json');
const { google } = require('googleapis');
const { embed } = require('./utils');
const ytdl = require('ytdl-core');
const ytda = google.youtube({
	'auth': ytAPIKey,
	'version': 'v3'
});

class musicHandler {
	getQueue(client, message) {
		if (!client.queue.get(message.guild.id)) {
			client.queue.set(message.guild.id, {
				'connection': null,
				'dispatcher': null,
				'loop': 'off',
				'skipReq': 0,
				'skippers': [],
				'songs': [],
				'textChannel': null,
				'voiceChannel': null
			}); // Set empty queue information when starting use of music commands if it doesn't exist
		}
		return client.queue.get(message.guild.id); // Return queue information for that guild
	}

	async returnPlaylist(url) {
		let buffer = []; // Acts as a buffer
		let result = await ytda.playlistItems.list({
			'maxResults': 15,
			'part': 'snippet',
			'playlistId': url.split('list=')[1]
		}); // Makes request, may need to re-add contentDetails to part
		result.data.items.forEach((song) => {
			buffer.push({
				'thumbnail': song.snippet.thumbnails.high.url,
				'title': song.snippet.title,
				'url': `https://www.youtube.com/watch?v=${song.contentDetails.videoId}`
			})
		})
		return {
			'songs': buffer,
			'title': result.data.items[0].snippet.title
		};
	}

	returnSongByURL(url) {
		let [id] = url.split('watch?v=');
		let res = null;
		if (!ytdl.validateID(id)) return null;
		ytdl.getInfo(id).then((songInfo) => (res = songInfo ? {
			'thumbnail': songInfo.thumbnails.high.url,
			'title': songInfo.videoDetails.title, // cleanHTML may be needed
			url
		} : null));
		return res;
	}

	async returnSongByName(args) {
		let result = await ytda.search.list({
			'maxResults': 1,
			'part': 'snippet,',
			'q': args.join(' '),
			'type': 'video'
		});
		result = result.data.items;
		return {
			'thumbnail': result.snippet.thumbnails.high.url,
			'title': result.snippet.title,
			'url': result.id.videoId
		};
	}

	play(client, message) {
		let queue = this.getQueue(client, message);

		if (queue.songs.length == 0) {
			queue.voiceChannel.leave();
			client.queue.delete(message.guild.id);
			return;
		}

		let stream = ytdl(queue.songs[0].url, { 'filter': 'audioonly' });
		if (!queue.textChannel) queue.textChannel = message.channel;
		queue.skippers = [];
		queue.dispatcher = queue.connection.play(stream);
		queue.dispatcher.on('finish', () => {
			if (queue.loop == 'queue') queue.songs.push(queue.songs[0])
			if (queue.loop != 'song') queue.songs.shift();

			if (queue.songs.length > 0) {
				let embedMsg = embed(message).setAuthor('MTPA')
				embedMsg.setDescription(`Now playing ${queue.songs[0].title} is now playing`)
				embedMsg.setFooter(`Requested by ${message.author.username}`)
				embedMsg.setImage(queue.songs[0].thumbnail)
				queue.textChannel.send(embedMsg);
			}

			this.play(client, message);
		});
		queue.dispatcher.on('error', (error) => client.error(error));
	}
}

module.exports = musicHandler;