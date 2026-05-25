import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-oo34NujVa_n_BbmODC17HKwsXE_sYQ8",
  authDomain: "smarthaatbd-a22f8.firebaseapp.com",
  projectId: "smarthaatbd-a22f8",
  appId: "1:1067082770064:web:c843be72515a8faa359a15"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
