import cv2
import numpy as np
import torch
import mediapipe as mp

 
IMG_SIZE = (96, 96)        
NUM_FRAMES = 75           
GRAYSCALE = True
MEAN, STD = 0.421, 0.165   # recompute 
VOCAB = list("abcdefghijklmnopqrstuvwxyz '")   
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

 
IN_CHANNELS = 1 if GRAYSCALE else 3
_LIP_IDX = sorted({i for pair in mp.solutions.face_mesh.FACEMESH_LIPS for i in pair})
 
 
def _crop_mouth(face_mesh, frame_bgr, prev_box):
    h, w = frame_bgr.shape[:2]
    result = face_mesh.process(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))
 
    if result.multi_face_landmarks:
        lm = result.multi_face_landmarks[0].landmark
        xs = np.array([lm[i].x * w for i in _LIP_IDX])
        ys = np.array([lm[i].y * h for i in _LIP_IDX])
        cx, cy = xs.mean(), ys.mean()
        half = max(xs.max() - xs.min(), ys.max() - ys.min()) * 0.75
        box = (int(cx - half), int(cy - half), int(cx + half), int(cy + half))
    elif prev_box is not None:
        box = prev_box
    else:
        return None, None
 
    x1, y1 = max(box[0], 0), max(box[1], 0)
    x2, y2 = min(box[2], w), min(box[3], h)
    if x2 <= x1 or y2 <= y1:
        return None, box
    return frame_bgr[y1:y2, x1:x2], box
 
 
def preprocess_video(video_path):
    cap = cv2.VideoCapture(video_path)
    frames, prev_box = [], None
 
    with mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False, max_num_faces=1
    ) as face_mesh:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            mouth, prev_box = _crop_mouth(face_mesh, frame, prev_box)
            if mouth is None:
                continue
            frames.append(prepare_mouth(mouth))
    cap.release()
 
    if not frames:
        raise ValueError("No face/mouth detected in the video.")
    return frames_to_tensor(frames)
 
 
def prepare_mouth(mouth_bgr):
    mouth = cv2.resize(mouth_bgr, IMG_SIZE)
    if GRAYSCALE:
        mouth = cv2.cvtColor(mouth, cv2.COLOR_BGR2GRAY)
    return mouth
 
 
def frames_to_tensor(frames):
    if len(frames) >= NUM_FRAMES:
        idx = np.linspace(0, len(frames) - 1, NUM_FRAMES).astype(int)
        frames = [frames[i] for i in idx]
    else:
        frames = list(frames) + [frames[-1]] * (NUM_FRAMES - len(frames))
 
    arr = (np.stack(frames).astype(np.float32) / 255.0 - MEAN) / STD
    arr = arr[None, ...] if GRAYSCALE else arr.transpose(3, 0, 1, 2)
    return torch.from_numpy(np.ascontiguousarray(arr)).unsqueeze(0)
 
 
def encode(text):
    return [VOCAB.index(c) + 1 for c in text.lower() if c in VOCAB]
 
 
def decode(logits):
    ids = logits.argmax(dim=-1)[0].tolist()
    out, prev = [], 0
    for i in ids:
        if i != prev and i != 0:
            out.append(VOCAB[i - 1])
        prev = i
    return "".join(out).strip()
