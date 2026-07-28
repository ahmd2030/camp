"use server";

import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, deleteDoc, getDoc } from 'firebase/firestore';

export interface AffiliateLink {
  id?: string;
  niche: string;
  productName: string;
  affiliateLink: string;
  status: boolean;
  createdAt: number;
}

export interface MailingList {
  id?: string;
  name: string;
  emails: string[];
  createdAt: number;
}

export async function createAffiliateLink(data: Omit<AffiliateLink, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'links_bank'), {
      ...data,
      createdAt: Date.now()
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAffiliateLink(id: string, data: Partial<AffiliateLink>) {
  try {
    const docRef = doc(db, 'links_bank', id);
    await updateDoc(docRef, data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAffiliateLink(id: string) {
  try {
    await deleteDoc(doc(db, 'links_bank', id));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAffiliateLinks() {
  try {
    const q = query(collection(db, 'links_bank'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return {
      success: true,
      links: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AffiliateLink))
    };
  } catch (error: any) {
    return { success: false, error: error.message, links: [] };
  }
}

export async function createMailingList(name: string, rawEmails: string) {
  try {
    // Clean and deduplicate emails
    const emailArray = rawEmails
      .split(/[\n,]+/) // split by comma or newline
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@')); // simple validation
      
    const uniqueEmails = [...new Set(emailArray)];

    if (uniqueEmails.length === 0) {
      return { success: false, error: 'لم يتم العثور على أي بريد إلكتروني صالح.' };
    }

    const docRef = await addDoc(collection(db, 'mailing_lists'), {
      name,
      emails: uniqueEmails,
      createdAt: Date.now()
    });
    return { success: true, id: docRef.id, count: uniqueEmails.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMailingLists() {
  try {
    const q = query(collection(db, 'mailing_lists'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return {
      success: true,
      lists: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MailingList))
    };
  } catch (error: any) {
    return { success: false, error: error.message, lists: [] };
  }
}

export async function deleteMailingList(id: string) {
  try {
    await deleteDoc(doc(db, 'mailing_lists', id));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMailingListById(id: string) {
  try {
    const docRef = doc(db, 'mailing_lists', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, list: { id: docSnap.id, ...docSnap.data() } as MailingList };
    } else {
      return { success: false, error: 'القائمة غير موجودة' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAffiliateLinkById(id: string) {
  try {
    const docRef = doc(db, 'links_bank', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, link: { id: docSnap.id, ...docSnap.data() } as AffiliateLink };
    } else {
      return { success: false, error: 'الرابط غير موجود' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
