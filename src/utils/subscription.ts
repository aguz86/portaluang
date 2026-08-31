export type SubscriptionPlanId = 'free_trial' | 'monthly' | 'semi_annual' | 'annual';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  badge?: string;
  durationLabel: string;
  durationShort: string;
  durationDays: number;
  durationHours?: number; // 24 for trial
  price: number;
  originalPrice?: number;
  discountText?: string;
  popular?: boolean;
  tagline: string;
  features: string[];
}

export interface UserSubscription {
  planId: SubscriptionPlanId;
  planName: string;
  price: number;
  durationDays: number;
  durationHours?: number;
  startDate: string; // ISO string
  expiresAt: string; // ISO string
  status: 'active' | 'expired';
  paymentMethod?: string;
  invoiceId?: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  date: string;
  planId: SubscriptionPlanId;
  planName: string;
  amount: number;
  originalAmount: number;
  discount: number;
  method: string;
  status: 'paid' | 'pending' | 'free_trial';
  userEmail: string;
  userName: string;
}

export interface UserProfile {
  name: string;
  email: string;
  job?: string;
  city?: string;
  lastLoginAt?: string;
  subscription: UserSubscription;
  createdAt: string;
}

export const syncSubscriptionPlans = async () => {
  try {
    const res = await fetch('/api/subscriptions');
    const data = await res.json();
    if (data.success && data.data && data.data.length > 0) {
      const dbPlans = data.data;
      SUBSCRIPTION_PLANS.forEach((p, idx) => {
         const match = dbPlans.find((dp: any) => dp.id === p.id);
         if (match) {
           SUBSCRIPTION_PLANS[idx].price = match.price;
           SUBSCRIPTION_PLANS[idx].name = match.name;
           if (match.features && match.features.length > 0) {
             SUBSCRIPTION_PLANS[idx].features = match.features;
           }
         }
      });
      // Update RENEWAL_PLANS to reflect the changes in price/name
      RENEWAL_PLANS.length = 0;
      RENEWAL_PLANS.push(...SUBSCRIPTION_PLANS.filter(p => p.id !== 'free_trial'));
      
      // Dispatch event to force re-render if needed
      window.dispatchEvent(new Event('plans-updated'));
    }
  } catch (err) {
    console.error('Failed to sync plans', err);
  }
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    badge: 'Uji Coba 24 Jam',
    durationLabel: 'Trial 24 Jam sejak email daftar',
    durationShort: '24 Jam',
    durationDays: 1,
    durationHours: 24,
    price: 0,
    tagline: 'Coba gratis seluruh 10 fitur tanpa komitmen & tanpa kartu kredit',
    features: [
      'Akses Penuh Semua 10 Fitur Unggulan',
      'Aktif 24 Jam sejak waktu email terdaftar',
      'Zero-Based Budgeting & Multi-Dompet',
      'Asisten Finansial AI & Bot Telegram Kilat',
      '100% Gratis Tanpa Biaya Tersembunyi'
    ]
  },
  {
    id: 'monthly',
    name: 'Paket Bulanan',
    badge: 'Fleksibel',
    durationLabel: 'Aktif 30 Hari',
    durationShort: '30 Hari',
    durationDays: 30,
    price: 29000,
    tagline: 'Solusi fleksibel per bulan untuk mengelola arus kas pribadi',
    features: [
      'Akses Penuh Semua Fitur Selama 30 Hari',
      'Konsultasi AI Penasihat Keuangan Cerdas',
      'Pencatatan Cepat via Bot Telegram',
      'Sinkronisasi Multi-Perangkat Cloud',
      'Update Otomatis & Support Prioritas'
    ]
  },
  {
    id: 'semi_annual',
    name: 'Paket 6 Bulan',
    badge: 'Hemat 15%',
    discountText: 'Hemat 15%',
    durationLabel: 'Aktif 180 Hari',
    durationShort: '180 Hari',
    durationDays: 180,
    price: 149000,
    originalPrice: 174000,
    tagline: 'Pilihan hemat 6 bulan untuk membangun disiplin keuangan kuat',
    features: [
      'Akses Penuh Semua Fitur Selama 180 Hari',
      'Hemat 15% dibanding langganan bulanan',
      'Pelacak Investasi Saham & Logam Mulia',
      'Kalkulator Bebas Hutang (Debt Snowball)',
      'Ekspor Laporan Keuangan ke Excel & PDF'
    ]
  },
  {
    id: 'annual',
    name: 'Paket 1 Tahun',
    badge: 'Paling Populer',
    discountText: 'Hemat 30%',
    durationLabel: 'Aktif 365 Hari',
    durationShort: '365 Hari',
    durationDays: 365,
    price: 249000,
    originalPrice: 348000,
    popular: true,
    tagline: 'Nilai terbaik & paling hemat (~Rp 20.750/bln) untuk kontrol finansial penuh',
    features: [
      'Akses Penuh Semua Fitur Selama 365 Hari (1 Tahun)',
      'Hemat Maksimal 30% (Hanya ~Rp 20.750/bulan)',
      'Prioritas Akses Fitur-Fitur AI Terbaru',
      'Penyimpanan Backup Cloud Tanpa Batas',
      'Layanan Konsultasi & Support VIP 24/7'
    ]
  }
];

export const calculateSubscriptionExpiration = (
  planId: SubscriptionPlanId, 
  fromDate: Date = new Date(),
  extendFromExisting?: string // ISO string if extending currently active subscription
): { expiresAt: Date; expiresAtISO: string } => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
  
  let baseTime = fromDate.getTime();
  if (extendFromExisting) {
    const existingTime = new Date(extendFromExisting).getTime();
    if (existingTime > baseTime) {
      baseTime = existingTime; // Akumulasi sisa hari aktif yang belum habis
    }
  }

  let endTime: number;
  if (plan.id === 'free_trial' || plan.durationHours) {
    endTime = baseTime + (plan.durationHours || 24) * 60 * 60 * 1000;
  } else {
    endTime = baseTime + plan.durationDays * 24 * 60 * 60 * 1000;
  }

  const expiresAt = new Date(endTime);
  return {
    expiresAt,
    expiresAtISO: expiresAt.toISOString()
  };
};

export const hasUserUsedTrial = (email?: string): boolean => {
  const targetEmail = (email || localStorage.getItem('auraledger_user_id') || '').trim().toLowerCase();
  if (!targetEmail) return false;

  try {
    const usedEmailsRaw = localStorage.getItem('auraledger_trial_used_emails');
    const usedEmails: string[] = usedEmailsRaw ? JSON.parse(usedEmailsRaw) : [];
    if (usedEmails.includes(targetEmail)) {
      return true;
    }
  } catch (e) {
    console.error('Error checking trial used emails', e);
  }

  // Also check if current subscription or profile was ever registered or initialized
  try {
    const rawSub = localStorage.getItem('auraledger_subscription');
    if (rawSub) {
      const sub: UserSubscription = JSON.parse(rawSub);
      if (sub.planId === 'free_trial' || sub.price === 0) {
        return true;
      }
    }
    const rawProfile = localStorage.getItem('auraledger_user_profile');
    if (rawProfile) {
      const prof: UserProfile = JSON.parse(rawProfile);
      if (prof.email?.toLowerCase() === targetEmail && prof.subscription) {
        if (prof.subscription.planId === 'free_trial' || prof.subscription.price === 0) {
          return true;
        }
      }
    }
  } catch (e) {
    console.error('Error checking trial in local storage', e);
  }

  return false;
};

export const markTrialAsUsed = (email: string): void => {
  const targetEmail = email.trim().toLowerCase();
  if (!targetEmail) return;

  try {
    const usedEmailsRaw = localStorage.getItem('auraledger_trial_used_emails');
    const usedEmails: string[] = usedEmailsRaw ? JSON.parse(usedEmailsRaw) : [];
    if (!usedEmails.includes(targetEmail)) {
      usedEmails.push(targetEmail);
      localStorage.setItem('auraledger_trial_used_emails', JSON.stringify(usedEmails));
    }
  } catch (e) {
    console.error('Error saving trial used email', e);
  }
};

// Available plans for renewal/upgrade (strictly paid plans, no trial)
export const RENEWAL_PLANS: SubscriptionPlan[] = SUBSCRIPTION_PLANS.filter(p => p.id !== 'free_trial');

export const saveUserRegistration = (
  name: string,
  email: string,
  planId: SubscriptionPlanId,
  city?: string
): UserProfile => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
  const now = new Date();
  const { expiresAtISO } = calculateSubscriptionExpiration(planId, now);

  // If user selected free trial, mark it as consumed for this email
  if (planId === 'free_trial') {
    markTrialAsUsed(email);
  }

  const subscription: UserSubscription = {
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    durationDays: plan.durationDays,
    durationHours: plan.durationHours,
    startDate: now.toISOString(),
    expiresAt: expiresAtISO,
    status: 'active'
  };

  const userProfile: UserProfile = {
    name,
    email,
    job: 'Pengguna Portal Uang',
    city,
    lastLoginAt: now.toISOString(),
    subscription,
    createdAt: now.toISOString()
  };

  localStorage.setItem('auraledger_user_id', email);
  localStorage.setItem('auraledger_user_profile', JSON.stringify(userProfile));
  localStorage.setItem('auraledger_subscription', JSON.stringify(subscription));
  
  // Track this user to backend so admin can see
  fetch('/api/admin/track-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userProfile)
  }).catch(e => console.error('Failed to sync user to backend', e));

  return userProfile;
};

export const activateUserPlan = (
  planId: SubscriptionPlanId,
  paymentMethod: string = 'QRIS',
  customAmount?: number,
  invoiceId?: string
): { profile: UserProfile; subscription: UserSubscription; paymentRecord: PaymentRecord } => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
  const now = new Date();
  const currentProfile = getUserProfile();
  const currentSub = getUserSubscription();

  // If extending an active paid subscription, add duration on top of current expiresAt
  const isCurrentlyActive = new Date(currentSub.expiresAt).getTime() > now.getTime();
  const extendFrom = (isCurrentlyActive && plan.id !== 'free_trial') ? currentSub.expiresAt : undefined;

  const { expiresAtISO } = calculateSubscriptionExpiration(planId, now, extendFrom);
  const actualAmount = customAmount !== undefined ? customAmount : plan.price;
  const invId = invoiceId || `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // If free trial was chosen, mark trial as used
  if (plan.id === 'free_trial') {
    markTrialAsUsed(currentProfile.email);
  }

  const subscription: UserSubscription = {
    planId: plan.id,
    planName: plan.name,
    price: actualAmount,
    durationDays: plan.durationDays,
    durationHours: plan.durationHours,
    startDate: now.toISOString(),
    expiresAt: expiresAtISO,
    status: 'active',
    paymentMethod,
    invoiceId: invId
  };

  const userProfile: UserProfile = {
    ...currentProfile,
    subscription
  };

  localStorage.setItem('auraledger_subscription', JSON.stringify(subscription));
  localStorage.setItem('auraledger_user_profile', JSON.stringify(userProfile));

  const paymentRecord: PaymentRecord = {
    id: 'pay_' + Date.now(),
    invoiceId: invId,
    date: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(now),
    planId: plan.id,
    planName: plan.name,
    amount: actualAmount,
    originalAmount: plan.originalPrice || plan.price,
    discount: (plan.originalPrice ? plan.originalPrice - actualAmount : (plan.price - actualAmount)),
    method: paymentMethod,
    status: plan.price === 0 ? 'free_trial' : 'paid',
    userEmail: currentProfile.email,
    userName: currentProfile.name
  };

  try {
    const existingRaw = localStorage.getItem('auraledger_payment_history');
    const history: PaymentRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
    history.unshift(paymentRecord);
    localStorage.setItem('auraledger_payment_history', JSON.stringify(history.slice(0, 20)));
  } catch (e) {
    console.error('Failed to update payment history', e);
  }

  return { profile: userProfile, subscription, paymentRecord };
};

export const getPaymentHistory = (): PaymentRecord[] => {
  try {
    const existingRaw = localStorage.getItem('auraledger_payment_history');
    if (existingRaw) {
      return JSON.parse(existingRaw);
    }
  } catch (e) {
    console.error('Failed to read payment history', e);
  }

  // Fallback initial record
  const sub = getUserSubscription();
  const profile = getUserProfile();
  return [
    {
      id: 'pay_init',
      invoiceId: sub.invoiceId || `INV-${new Date().getFullYear()}01-0001`,
      date: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(sub.startDate)),
      planId: sub.planId,
      planName: sub.planName,
      amount: sub.price,
      originalAmount: sub.price,
      discount: 0,
      method: sub.paymentMethod || (sub.price === 0 ? 'Free Trial' : 'QRIS'),
      status: sub.price === 0 ? 'free_trial' : 'paid',
      userEmail: profile.email,
      userName: profile.name
    }
  ];
};

export const getUserSubscription = (): UserSubscription => {
  try {
    const raw = localStorage.getItem('auraledger_subscription');
    if (raw) {
      const sub: UserSubscription = JSON.parse(raw);
      const isExpired = new Date(sub.expiresAt).getTime() < Date.now();
      return {
        ...sub,
        status: isExpired ? 'expired' : 'active'
      };
    }
  } catch (e) {
    console.error('Failed to read subscription from localStorage', e);
  }

  // Default fallback if not registered yet (24h free trial)
  const defaultExp = calculateSubscriptionExpiration('free_trial');
  return {
    planId: 'free_trial',
    planName: 'Free Trial (24 Jam)',
    price: 0,
    durationDays: 1,
    durationHours: 24,
    startDate: new Date().toISOString(),
    expiresAt: defaultExp.expiresAtISO,
    status: 'active'
  };
};

export const getUserProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem('auraledger_user_profile');
    if (raw) {
      const profile: UserProfile = JSON.parse(raw);
      profile.subscription = getUserSubscription();
      return profile;
    }
  } catch (e) {
    console.error('Failed to read profile from localStorage', e);
  }

  const sub = getUserSubscription();
  const email = localStorage.getItem('auraledger_user_id') || 'caksuga86@gmail.com';
  return {
    name: email.split('@')[0] || 'Caksuga',
    email,
    job: 'Pengguna Portal Uang',
    subscription: sub,
    createdAt: new Date().toISOString()
  };
};

export const getRemainingTimeDisplay = (expiresAtISO: string): { 
  text: string; 
  isExpired: boolean; 
  isUrgent: boolean;
  formattedExpiry: string;
} => {
  const now = Date.now();
  const expireDate = new Date(expiresAtISO);
  const expireTime = expireDate.getTime();
  const diffMs = expireTime - now;

  const formattedExpiry = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(expireDate);

  if (diffMs <= 0) {
    return {
      text: 'Masa aktif telah berakhir',
      isExpired: true,
      isUrgent: true,
      formattedExpiry
    };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) {
    return {
      text: `${diffDays} hari lagi`,
      isExpired: false,
      isUrgent: diffDays <= 2,
      formattedExpiry
    };
  } else {
    return {
      text: `${diffHours} jam ${diffMins} menit lagi`,
      isExpired: false,
      isUrgent: true,
      formattedExpiry
    };
  }
};
