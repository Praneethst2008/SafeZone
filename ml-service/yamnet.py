import tensorflow_hub as hub
import tensorflow as tf
import numpy as np
import soundfile as sf
import subprocess
import os

model = hub.load("https://tfhub.dev/google/yamnet/1")

def convert_to_wav(input_path, output_path):
    subprocess.run([
        "ffmpeg", "-y",
        "-i", input_path,
        "-ar", "16000",
        "-ac", "1",
        output_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def classify_audio(path):
    wav_path = path.replace(".webm", ".wav")
    convert_to_wav(path, wav_path)

    audio, sr = sf.read(wav_path)
    audio = audio.astype(np.float32)

    scores, embeddings, spectrogram = model(audio)
    mean_scores = tf.reduce_mean(scores, axis=0)
    top_class = tf.argmax(mean_scores)

    class_map = tf.io.gfile.GFile(
        tf.keras.utils.get_file(
            "yamnet_class_map.csv",
            "https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv"
        )
    ).read().splitlines()[1:]

    label = class_map[top_class].split(",")[2]
    confidence = float(mean_scores[top_class])

    return {
        "label": label,
        "confidence": confidence
    }

#print("Top 5 predictions:")
#for label, score in top_predictions[:5]:
#    print(label, round(score, 3))
