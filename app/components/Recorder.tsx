// src/components/Recorder.tsx
import React, { useState, useRef, useEffect } from "react";
import { Button, Alert, Snackbar } from "@mui/material";
import Spinner from "@/app/Spinner";
import { DynamicWidget } from "@/lib/dynamic";

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob, type: string) => void;
  isLoading: boolean;
}

const Recorder: React.FC<RecorderProps> = ({
  onRecordingComplete,
  isLoading,
}) => {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const allowedMimeTypes = [
    "audio/mpeg", // mp3
    "audio/mp4", // mp4, m4a
    "audio/x-m4a", // m4a
    "audio/wav", // wav
    "audio/webm", // webm
    "audio/ogg", // ogg
    "audio/mpga", // mpga
  ];
  const getSupportedMimeType = (): string[] | undefined => {
    const mimeTypes = [
      ["webm", "audio/webm;codecs=opus"],
      ["ogg", "audio/ogg;codecs=opus"],
      ["mp4", "audio/mp4"],
      ["wav", "audio/wav"],
      ["mpeg", "audio/mpeg"], // mp3
      ["mpga", "audio/mpga"], // mpga
    ];
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type[1])) {
        return type;
      }
    }
    return undefined;
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up the audio context and analyser node for visualization
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Start visualization
      drawVisualization();

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        setError("No supported audio MIME types found for recording.");
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      // Set up the media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType[1],
      });

      mediaRecorderRef.current.addEventListener(
        "dataavailable",
        (event: BlobEvent) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        },
      );

      mediaRecorderRef.current.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType[1],
        });
        onRecordingComplete(audioBlob, mimeType[0]);
        // Stop all audio tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());

        // Clean up the audio context and cancel the animation frame
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
      });

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
            setError(
              "Microphone access was denied. Please allow access to the microphone." +
                err.message,
            );
            break;
          case "NotFoundError":
            setError(
              "No microphone was found. Please connect a microphone and try again." +
                err.message,
            );
            break;
          case "NotReadableError":
            setError(
              "Microphone is already in use by another application." +
                err.message,
            );
            break;
          default:
            setError(
              "An error occurred while accessing the microphone." + err.message,
            );
        }
      } else {
        // @ts-ignore
        setError("An unexpected error occurred." + err.message);
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleCloseError = () => {
    setError(null);
  };

  const drawVisualization = () => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current)
      return;

    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    const WIDTH = canvasRef.current.width;
    const HEIGHT = canvasRef.current.height;

    const x = 0;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      animationFrameIdRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

      // Shift the canvas to the left
      const scrollSpeed = 2; // Adjust this value to control speed

      // Create a temporary canvas to hold the current image
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = WIDTH;
      tempCanvas.height = HEIGHT;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      tempCtx.drawImage(canvasRef.current!, 0, 0);

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      canvasCtx.drawImage(tempCanvas, -scrollSpeed, 0);

      // Draw the new data on the right edge
      const newDataWidth = scrollSpeed; // The width of new data to draw
      const sliceWidth = newDataWidth / dataArrayRef.current.length;
      let xPos = WIDTH - scrollSpeed;

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "#1976d2"; // Blue color

      canvasCtx.beginPath();

      let y = (dataArrayRef.current[0] / 128.0) * (HEIGHT / 2);

      canvasCtx.moveTo(xPos, y);

      for (let i = 1; i < dataArrayRef.current.length; i++) {
        y = (dataArrayRef.current[i] / 128.0) * (HEIGHT / 2);
        xPos += sliceWidth;
        canvasCtx.lineTo(xPos, y);
      }

      canvasCtx.stroke();
    };

    draw();
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{marginLeft: "0px", marginTop: "10px", marginRight: "10px", alignSelf: "self-start"}}>
      <div style={{ display: "flex", alignItems: "left", flexFlow: "row-reverse"}}>
        {/* Canvas for Audio Visualization */}
        <div style={{ marginLeft: "10px" }}>
          <canvas
            ref={canvasRef}
            width={150}
            height={36}
            style={{ width: "150px", height: "36px" }}
          />
        </div>

        {recording ? (
          <Button
            variant="contained"
            color="secondary"
            onClick={stopRecording}
            disabled={isLoading}
          >
            Stop Recording
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={startRecording}
            disabled={isLoading}
          >
            Start Recording
          </Button>
        )}
      </div>

      {/* Conditionally render Snackbar when there's an error */}
      {error && (
        <Snackbar
          open
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseError}
            severity="error"
            sx={{ width: "100%" }}
          >
            {error}
          </Alert>
        </Snackbar>
      )}
    </div>
  );
};
export default Recorder;
