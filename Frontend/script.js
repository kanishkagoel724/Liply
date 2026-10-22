let stream, recorder, chunks=[], lipData=[], faceMesh, camera;
let isRecording=false, isUploadMode=false, uploadedFile=null;

const vid=document.getElementById('previewVideo');
const img=document.getElementById('imgPreview');
const out=document.getElementById('output');
const overlay=document.getElementById('overlay');
const ctx=overlay.getContext('2d');

setTimeout(()=>{
  document.getElementById('loading').style.display='none';
  document.getElementById('landing').style.display='flex';
},1000);

document.getElementById('uploadBtn').onclick=()=>document.getElementById('fileInput').click();
document.getElementById('backBtn').onclick=()=>goHome();
document.getElementById('fileInput').onchange=e=>{ if(e.target.files[0]) showFile(e.target.files[0]); };
document.getElementById('dropZone').onclick=()=>document.getElementById('fileInput').click();

function showFile(file){
  document.getElementById('landing').style.display='none';
  document.getElementById('app').style.display='flex';
  uploadedFile=file;
  isUploadMode=true;
  lipData=[];
  const url=URL.createObjectURL(file);
  if(file.type.startsWith('image')){
    img.src=url; img.style.display='block'; vid.style.display='none';
    document.getElementById('analyzeUploadBtn').style.display='none';
    out.innerText='Image Uploaded - Video Upload Karo Lips Ke Liye';
  } else {
    vid.src=url; vid.style.display='block'; img.style.display='none';
    vid.loop=false; vid.muted=true; vid.play();
    document.getElementById('recStart').style.display='none';
    document.getElementById('recStop').style.display='none';
    document.getElementById('analyzeUploadBtn').style.display='inline-block';
    out.innerText='📁 Video Uploaded - Ab Analyze Button Dabao Lips Ke Liye';
    vid.onloadedmetadata=()=>{
      overlay.width=vid.videoWidth; overlay.height=vid.videoHeight;
      startLipTrackingForUpload();
    };
  }
}

async function startLive(){
  document.getElementById('landing').style.display='none';
  document.getElementById('app').style.display='flex';
  isUploadMode=false; lipData=[];
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:true, audio:false});
    vid.srcObject=stream; vid.style.display='block'; img.style.display='none';
    await vid.play();
    document.getElementById('recStart').style.display='inline-block';
    document.getElementById('analyzeUploadBtn').style.display='none';
    out.innerText='👄 Lips Detect Ho Rahe Hain... Muh hilao';
    startLipTracking();
  }catch(e){ out.innerText='❌ '+e.message; }
}
document.getElementById('liveBtn').onclick=startLive;

function startLipTracking(){
  faceMesh=new FaceMesh({locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
  faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
  faceMesh.onResults(onFaceResults);
  camera=new Camera(vid,{
    onFrame:async()=>{ await faceMesh.send({image:vid}); },
    width:640, height:480
  });
  camera.start();
}

function startLipTrackingForUpload(){
  faceMesh=new FaceMesh({locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
  faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
  faceMesh.onResults(onFaceResults);
  async function processFrame(){
    if(vid.paused || vid.ended || !isUploadMode) return;
    await faceMesh.send({image:vid});
    requestAnimationFrame(processFrame);
  }
  vid.onplay=()=>{ lipData=[]; processFrame(); };
}

function onFaceResults(results){
  // Canvas size set
  if(!overlay.width || overlay.width !== vid.videoWidth){
    overlay.width = vid.videoWidth;
    overlay.height = vid.videoHeight;
  }
  ctx.clearRect(0,0,overlay.width,overlay.height);

  if(results.multiFaceLandmarks && results.multiFaceLandmarks[0]){
    const landmarks = results.multiFaceLandmarks[0];
    
    // दोनों lips के points
    const outerLips = [61,146,91,181,84,17,314,405,321,375,291,308,324,318,402,317,14,87,178,88,95];
    const innerLips = [78,95,88,178,87,14,317,402,318,324,308,291,375,321,405,314,17,84,181,91,146];

    // बहुत light highlight - barely visible
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.7)'; // light pink
    ctx.fillStyle = 'rgba(255, 182, 193, 0.12)'; // bahut halka fill
    ctx.lineWidth = 1.2; // पतली line
    ctx.lineJoin = 'round';

    // Outer lips
    ctx.beginPath();
    outerLips.forEach((idx, i)=>{
      const p = landmarks[idx];
      const x = p.x * overlay.width;
      const y = p.y * overlay.height;
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner lips - aur bhi light
    ctx.strokeStyle = 'rgba(255, 192, 203, 0.5)';
    ctx.fillStyle = 'rgba(255, 192, 203, 0.06)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    innerLips.forEach((idx, i)=>{
      const p = landmarks[idx];
      const x = p.x * overlay.width;
      const y = p.y * overlay.height;
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// --- YE NAYA HAI - BACKEND SE BAAT KAREGA ---
async function sendToBackend(blobOrFile){
  out.innerText = '⏳ Backend ko bhej raha hai...';
  const form = new FormData();
  form.append('file', blobOrFile, 'video.webm');
  
  // Agar backend Render pe hai to yahan uska URL daal de
  const BACKEND_URL = 'https://liply-backend.onrender.com/predict';
  // Local test ke liye: 'http://localhost:5000/predict'

  try{
    const res = await fetch(BACKEND_URL, { method:'POST', body: form });
    const data = await res.json();
    console.log("Backend ka jawab:", data);
    return data.text || data.prediction || JSON.stringify(data);
  }catch(e){
    console.error(e);
    // Agar backend fail ho jaye to purana wala fake result dikha de
    return analyzeLipsLocal() + " (Backend offline - Demo Result)";
  }
}

function startRec(){
  if(!stream){ alert('Pehle Live Camera On Karo'); return; }
  chunks=[]; lipData=[]; isRecording=true;
  recorder=new MediaRecorder(stream);
  recorder.ondataavailable=e=>{ if(e.data.size>0) chunks.push(e.data); };
  recorder.onstop=async ()=>{
    const blob=new Blob(chunks,{type:'video/webm'});
    const backendText = await sendToBackend(blob);
    
    const reader=new FileReader();
    reader.onloadend=()=>{
      localStorage.setItem('liply_video', reader.result);
      localStorage.setItem('liply_text', backendText);
      localStorage.setItem('liply_duration', document.getElementById('timer').innerText);
      window.location.href='result.html';
    };
    reader.readAsDataURL(blob);
  };
  recorder.start();
  document.getElementById('recStart').style.display='none';
  document.getElementById('recStop').style.display='inline-block';
  out.innerText='🔴 Lips Recording... bina awaz ke bhi chalega';
  let s=0; window.t=setInterval(()=>{ s++; document.getElementById('timer').innerText=s+' sec'; },1000);
}

function stopRec(){
  if(!isRecording) return;
  isRecording=false;
  recorder.stop();
  clearInterval(window.t);
  document.getElementById('recStop').style.display='none';
  out.innerText='Processing Lips Data...';
}

async function analyzeUploadedVideo(){
  if(lipData.length===0){ alert('Lips detect nahi hue - dusri video try karo'); return; }
  const backendText = await sendToBackend(uploadedFile);
  const reader=new FileReader();
  reader.onloadend=()=>{
    localStorage.setItem('liply_video', reader.result);
    localStorage.setItem('liply_text', backendText + '\n(Source: Uploaded Video)');
    localStorage.setItem('liply_duration', Math.floor(vid.duration)+' sec');
    window.location.href='result.html';
  };
  reader.readAsDataURL(uploadedFile);
}

function analyzeLipsLocal(){
  if(lipData.length===0) return "No lip movement detected";
  let openEvents=0;
  for(let i=1;i<lipData.length;i++){ if(lipData[i]>0.02 && lipData[i-1]<=0.02) openEvents++; }
  if(openEvents <= 2) return "Hi";
  else if(openEvents <= 5) return "Hello, kaise ho?";
  else if(openEvents <= 8) return "Namaste, main theek hoon";
  else if(openEvents <= 12) return "Silence speaks louder";
  else return "Hello friends, welcome to LIPLY";
}

document.getElementById('recStart').onclick=startRec;
document.getElementById('recStop').onclick=stopRec;
document.getElementById('analyzeUploadBtn').onclick=analyzeUploadedVideo;

function goHome(){
  if(stream) stream.getTracks().forEach(t=>t.stop());
  if(camera) camera.stop();
  isUploadMode=false;
  document.getElementById('landing').style.display='flex';
  document.getElementById('app').style.display='none';
  vid.pause(); vid.srcObject=null;
  document.getElementById('analyzeUploadBtn').style.display='none';
}
