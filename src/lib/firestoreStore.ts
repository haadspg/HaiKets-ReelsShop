import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import {
  AgentWallet,
  Product,
  SupportedChain,
  TransactionRecord,
  User,
} from '../types.ts';
import { INITIAL_PRODUCTS, SUPPORTED_CHAINS_CONFIG } from '../mockData.ts';

const sanitizeId = (raw: string, fallbackPrefix = 'doc'): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}_${Date.now()}`;
};

const formatTimestamp = (ts: unknown): string => {
  if (!ts) return 'Just now';
  if (ts instanceof Timestamp) {
    return ts.toDate().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (typeof ts === 'string') return ts;
  return 'Just now';
};

const toMillis = (ts: unknown): number => {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export async function syncFirebaseUserAndWallet(
  fbUser: FirebaseUser,
  defaultWallet: AgentWallet
): Promise<{ user: User; wallet: AgentWallet }> {
  const uid = sanitizeId(fbUser.uid, 'usr');
  const userDocRef = doc(db, 'users', uid);
  const privateDocRef = doc(db, 'users', uid, 'private', 'info');
  const walletDocRef = doc(db, 'wallets', uid);

  const isBootstrappedAdmin =
    fbUser.emailVerified && fbUser.email === 'truqaman@gmail.com';
  const displayName = (fbUser.displayName || fbUser.email?.split('@')[0] || 'Shopper').slice(0, 100);
  const avatar = (
    fbUser.photoURL ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  ).slice(0, 500);

  let role: 'ADMIN' | 'SHOPPER' = isBootstrappedAdmin ? 'ADMIN' : 'SHOPPER';
  let enclaveAddress = defaultWallet.address;
  let connectedAtIso = new Date().toISOString();

  try {
    const existingSnap = await getDoc(userDocRef);
    if (!existingSnap.exists()) {
      await setDoc(userDocRef, {
        uid,
        name: displayName,
        avatar,
        enclaveAddress,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data();
      role = existingData.role === 'ADMIN' || isBootstrappedAdmin ? 'ADMIN' : 'SHOPPER';
      if (typeof existingData.enclaveAddress === 'string') {
        enclaveAddress = existingData.enclaveAddress;
      }
      await updateDoc(userDocRef, {
        name: displayName,
        avatar,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  try {
    const privateSnap = await getDoc(privateDocRef);
    if (!privateSnap.exists()) {
      await setDoc(privateDocRef, {
        uid,
        email: (fbUser.email || 'shopper@haikets.app').slice(0, 254),
        authProvider: 'OAUTH2_GOOGLE',
        connectedAt: serverTimestamp(),
      });
    } else {
      const pData = privateSnap.data();
      connectedAtIso = formatTimestamp(pData.connectedAt);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/info`);
  }

  let syncedWallet: AgentWallet = { ...defaultWallet, address: enclaveAddress };

  try {
    const walletSnap = await getDoc(walletDocRef);
    if (!walletSnap.exists()) {
      await setDoc(walletDocRef, {
        ownerUid: uid,
        address: enclaveAddress,
        network: defaultWallet.network,
        chainId: defaultWallet.chainId,
        usdqBase: defaultWallet.usdqBalances.base,
        usdqOptimism: defaultWallet.usdqBalances.optimism,
        usdqPolygon: defaultWallet.usdqBalances.polygon,
        totalUSDqBalance: defaultWallet.totalUSDqBalance,
        shopTokenBalance: defaultWallet.shopTokenBalance,
        gasSavedUSD: defaultWallet.gasSavedUSD,
        isSessionKeyActive: defaultWallet.isSessionKeyActive,
        updatedAt: serverTimestamp(),
      });
    } else {
      const wData = walletSnap.data();
      syncedWallet = {
        ...defaultWallet,
        address: wData.address || enclaveAddress,
        network: (wData.network as SupportedChain) || 'base',
        chainId: Number(wData.chainId) || 8453,
        usdqBalances: {
          base: Number(wData.usdqBase ?? defaultWallet.usdqBalances.base),
          optimism: Number(wData.usdqOptimism ?? defaultWallet.usdqBalances.optimism),
          polygon: Number(wData.usdqPolygon ?? defaultWallet.usdqBalances.polygon),
        },
        totalUSDqBalance: Number(wData.totalUSDqBalance ?? defaultWallet.totalUSDqBalance),
        shopTokenBalance: Number(wData.shopTokenBalance ?? defaultWallet.shopTokenBalance),
        gasSavedUSD: Number(wData.gasSavedUSD ?? defaultWallet.gasSavedUSD),
        isSessionKeyActive: Boolean(wData.isSessionKeyActive ?? true),
      };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `wallets/${uid}`);
  }

  // Seed products collection if empty and user is admin
  if (role === 'ADMIN') {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (snap.empty) {
        for (const p of INITIAL_PRODUCTS) {
          const pId = sanitizeId(p.id, 'prod');
          await setDoc(doc(db, 'products', pId), {
            id: pId,
            ownerUid: uid,
            name: p.name.slice(0, 160),
            tagline: p.tagline.slice(0, 240),
            description: p.description.slice(0, 2000),
            category: p.category.slice(0, 80),
            priceUSDq: p.priceUSDq,
            priceETH: p.priceETH,
            priceUSD: p.priceUSD,
            inventory: Math.max(0, Math.floor(p.inventory)),
            initialStock: Math.max(0, Math.floor(p.initialStock)),
            mediaUrl: p.mediaUrl.slice(0, 500),
            creatorHandle: p.creatorHandle.slice(0, 80),
            creatorName: p.creatorName.slice(0, 100),
            creatorAvatar: p.creatorAvatar.slice(0, 500),
            likesCount: Math.max(0, Math.floor(p.likesCount)),
            contractAddress: p.contractAddress.slice(0, 42),
            tokenId: p.tokenId.slice(0, 32),
            tags: p.tags.slice(0, 10).map((t) => t.slice(0, 40)),
            reviewsCount: Math.max(0, Math.floor(p.reviewsCount)),
            rating: p.rating,
            supportedChains: p.supportedChains.slice(0, 5),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  }

  return {
    user: {
      id: uid,
      name: displayName,
      email: fbUser.email || '',
      avatar,
      role,
      authProvider: 'OAUTH2_GOOGLE',
      connectedAt: connectedAtIso,
      enclaveAddress,
    },
    wallet: syncedWallet,
  };
}

export function subscribeToFirestoreProducts(
  onUpdate: (products: Product[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'products'),
    (snapshot) => {
      if (snapshot.empty) return;
      const list: Product[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          name: data.name || 'Untitled Product',
          tagline: data.tagline || '',
          description: data.description || '',
          category: data.category || 'Collectibles',
          priceUSDq: Number(data.priceUSDq || 0),
          priceETH: Number(data.priceETH || 0),
          priceUSD: Number(data.priceUSD || data.priceUSDq || 0),
          inventory: Number(data.inventory ?? 0),
          initialStock: Number(data.initialStock ?? data.inventory ?? 0),
          mediaUrl: data.mediaUrl || '/src/assets/images/reels_cyber_watch_1793613626518.jpg',
          creatorHandle: data.creatorHandle || '@haikets',
          creatorName: data.creatorName || 'HaiKets Creator',
          creatorAvatar:
            data.creatorAvatar ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          likesCount: Number(data.likesCount ?? 0),
          isLiked: false,
          contractAddress: data.contractAddress || '0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781',
          tokenId: data.tokenId || '#0001',
          tags: Array.isArray(data.tags) ? data.tags : [],
          reviewsCount: Number(data.reviewsCount ?? 0),
          rating: Number(data.rating ?? 5.0),
          createdAt: formatTimestamp(data.createdAt),
          supportedChains: Array.isArray(data.supportedChains)
            ? (data.supportedChains as SupportedChain[])
            : ['base', 'optimism', 'polygon'],
        };
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  );
}

export function subscribeToUserWallet(
  uid: string,
  baseWallet: AgentWallet,
  onUpdate: (wallet: AgentWallet) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid, 'usr');
  return onSnapshot(
    doc(db, 'wallets', safeUid),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      onUpdate({
        ...baseWallet,
        address: data.address || baseWallet.address,
        network: (data.network as SupportedChain) || baseWallet.network,
        chainId: Number(data.chainId) || baseWallet.chainId,
        usdqBalances: {
          base: Number(data.usdqBase ?? baseWallet.usdqBalances.base),
          optimism: Number(data.usdqOptimism ?? baseWallet.usdqBalances.optimism),
          polygon: Number(data.usdqPolygon ?? baseWallet.usdqBalances.polygon),
        },
        totalUSDqBalance: Number(data.totalUSDqBalance ?? baseWallet.totalUSDqBalance),
        shopTokenBalance: Number(data.shopTokenBalance ?? baseWallet.shopTokenBalance),
        gasSavedUSD: Number(data.gasSavedUSD ?? baseWallet.gasSavedUSD),
        isSessionKeyActive: Boolean(data.isSessionKeyActive ?? baseWallet.isSessionKeyActive),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `wallets/${safeUid}`);
    }
  );
}

export function subscribeToUserTransactions(
  uid: string,
  onUpdate: (transactions: TransactionRecord[]) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid, 'usr');
  const q = query(collection(db, 'transactions'), where('ownerUid', '==', safeUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            _sortMs: toMillis(data.createdAt),
            record: {
              id: data.id || d.id,
              hash: data.hash,
              type: data.type,
              productId: data.productId,
              productTitle: data.productTitle,
              tokenAmount: Number(data.tokenAmount || 0),
              tokenSymbol: data.tokenSymbol || 'USDq',
              sourceChain: data.sourceChain,
              destinationChain: data.destinationChain,
              ccipMessageId: data.ccipMessageId,
              status: data.status || 'CONFIRMED',
              timestamp: formatTimestamp(data.createdAt),
              blockNumber: Number(data.blockNumber || 0),
              gasSponsored: Boolean(data.gasSponsored),
              executor: data.executor || 'AUTONOMOUS_AGENT',
            } as TransactionRecord,
          };
        })
        .sort((a, b) => b._sortMs - a._sortMs)
        .map((item) => item.record);

      onUpdate(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    }
  );
}

export async function persistWalletState(uid: string, wallet: AgentWallet): Promise<void> {
  const safeUid = sanitizeId(uid, 'usr');
  const chainCfg = SUPPORTED_CHAINS_CONFIG[wallet.network] || SUPPORTED_CHAINS_CONFIG.base;
  try {
    await updateDoc(doc(db, 'wallets', safeUid), {
      network: wallet.network,
      chainId: chainCfg.chainId,
      usdqBase: Number(wallet.usdqBalances.base || 0),
      usdqOptimism: Number(wallet.usdqBalances.optimism || 0),
      usdqPolygon: Number(wallet.usdqBalances.polygon || 0),
      totalUSDqBalance: Number(wallet.totalUSDqBalance || 0),
      shopTokenBalance: Number(wallet.shopTokenBalance || 0),
      gasSavedUSD: Number(wallet.gasSavedUSD || 0),
      isSessionKeyActive: Boolean(wallet.isSessionKeyActive),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `wallets/${safeUid}`);
  }
}

export async function persistTransaction(
  uid: string,
  tx: TransactionRecord
): Promise<void> {
  const safeUid = sanitizeId(uid, 'usr');
  const txId = sanitizeId(tx.id, 'tx');
  const payload: Record<string, unknown> = {
    id: txId,
    ownerUid: safeUid,
    hash: tx.hash.slice(0, 128),
    type: tx.type,
    tokenAmount: Number(tx.tokenAmount || 0),
    tokenSymbol: tx.tokenSymbol || 'USDq',
    status: tx.status || 'CONFIRMED',
    blockNumber: Math.max(0, Math.floor(tx.blockNumber || 18921400)),
    gasSponsored: Boolean(tx.gasSponsored),
    executor: tx.executor || 'AUTONOMOUS_AGENT',
    createdAt: serverTimestamp(),
  };

  if (tx.productId) payload.productId = tx.productId.slice(0, 128);
  if (tx.productTitle) payload.productTitle = tx.productTitle.slice(0, 160);
  if (tx.sourceChain) payload.sourceChain = tx.sourceChain;
  if (tx.destinationChain) payload.destinationChain = tx.destinationChain;
  if (tx.ccipMessageId) payload.ccipMessageId = tx.ccipMessageId.slice(0, 128);

  try {
    await setDoc(doc(db, 'transactions', txId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `transactions/${txId}`);
  }
}

export async function persistProductCreate(uid: string, product: Product): Promise<void> {
  const safeUid = sanitizeId(uid, 'usr');
  const pId = sanitizeId(product.id, 'prod');
  try {
    await setDoc(doc(db, 'products', pId), {
      id: pId,
      ownerUid: safeUid,
      name: product.name.slice(0, 160),
      tagline: product.tagline.slice(0, 240),
      description: product.description.slice(0, 2000),
      category: product.category.slice(0, 80),
      priceUSDq: Number(product.priceUSDq),
      priceETH: Number(product.priceETH),
      priceUSD: Number(product.priceUSD),
      inventory: Math.max(0, Math.floor(product.inventory)),
      initialStock: Math.max(0, Math.floor(product.initialStock)),
      mediaUrl: product.mediaUrl.slice(0, 500),
      creatorHandle: product.creatorHandle.slice(0, 80),
      creatorName: product.creatorName.slice(0, 100),
      creatorAvatar: product.creatorAvatar.slice(0, 500),
      likesCount: Math.max(0, Math.floor(product.likesCount)),
      contractAddress: product.contractAddress.slice(0, 42),
      tokenId: product.tokenId.slice(0, 32),
      tags: product.tags.slice(0, 10).map((t) => t.slice(0, 40)),
      reviewsCount: Math.max(0, Math.floor(product.reviewsCount)),
      rating: Number(product.rating || 5),
      supportedChains: product.supportedChains.slice(0, 5),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `products/${pId}`);
  }
}

export async function persistProductInventory(
  productId: string,
  newInventory: number
): Promise<void> {
  const pId = sanitizeId(productId, 'prod');
  try {
    const snap = await getDoc(doc(db, 'products', pId));
    if (!snap.exists()) return;
    await updateDoc(doc(db, 'products', pId), {
      inventory: Math.max(0, Math.floor(newInventory)),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${pId}`);
  }
}

export async function persistProductUpdate(
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  const pId = sanitizeId(productId, 'prod');
  try {
    const snap = await getDoc(doc(db, 'products', pId));
    if (!snap.exists()) return;
    const sanitized: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined) sanitized.name = updates.name.slice(0, 160);
    if (updates.tagline !== undefined) sanitized.tagline = updates.tagline.slice(0, 240);
    if (updates.description !== undefined) sanitized.description = updates.description.slice(0, 2000);
    if (updates.category !== undefined) sanitized.category = updates.category.slice(0, 80);
    if (updates.priceUSDq !== undefined) sanitized.priceUSDq = Number(updates.priceUSDq);
    if (updates.priceETH !== undefined) sanitized.priceETH = Number(updates.priceETH);
    if (updates.priceUSD !== undefined) sanitized.priceUSD = Number(updates.priceUSD);
    if (updates.inventory !== undefined) sanitized.inventory = Math.max(0, Math.floor(updates.inventory));
    if (updates.mediaUrl !== undefined) sanitized.mediaUrl = updates.mediaUrl.slice(0, 500);
    if (updates.tags !== undefined) sanitized.tags = updates.tags.slice(0, 10).map((t) => t.slice(0, 40));

    await updateDoc(doc(db, 'products', pId), sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${pId}`);
  }
}

export async function persistProductDelete(productId: string): Promise<void> {
  const pId = sanitizeId(productId, 'prod');
  try {
    await deleteDoc(doc(db, 'products', pId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${pId}`);
  }
}
