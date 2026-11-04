import { 
  JenisJabatan, 
  JenisLayanan, 
  EWSStatus, 
  ParameterConfig, 
  HariLibur, 
  Pegawai, 
  EWSItem,
  DokumenRecord
} from '../types';

/**
 * Format Date as YYYY-MM-DD avoiding UTC day offset issues (WIB is UTC+7)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD safely into local Date at midnight
 */
export function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

/**
 * KGB Target: TMT KGB Terakhir + 2 Tahun
 */
export function calculateKgbTarget(tmtKgbTerakhir: string): string {
  const d = parseDate(tmtKgbTerakhir);
  d.setFullYear(d.getFullYear() + 2);
  return formatDate(d);
}

/**
 * KP Target: 4 tahun dari TMT Pangkat Terakhir, disesuaikan ke periode usul BKN terdekat
 * Periode BKN: 1 Februari, 1 April, 1 Juni, 1 Agustus, 1 Oktober, 1 Desember
 */
export function calculateKpTarget(
  tmtPangkatTerakhir: string, 
  periodeBkn: string[] = ["02-01", "04-01", "06-01", "08-01", "10-01", "12-01"]
): string {
  const d = parseDate(tmtPangkatTerakhir);
  const targetYear = d.getFullYear() + 4;
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();

  // Find the earliest promotion period in targetYear or next year that is >= targetDate
  for (const p of periodeBkn) {
    const [pMonth, pDay] = p.split('-').map(Number);
    if (pMonth > month || (pMonth === month && pDay >= day)) {
      return `${targetYear}-${String(pMonth).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
    }
  }

  // If after the last period of targetYear, jump to first period of next year
  const [firstMonth, firstDay] = periodeBkn[0].split('-').map(Number);
  return `${targetYear + 1}-${String(firstMonth).padStart(2, '0')}-${String(firstDay).padStart(2, '0')}`;
}

/**
 * Pensiun BUP Target:
 * Usia BUP: 58 th (administrasi, fungsional pertama/muda/terampil), 60 th (madya & pimpinan tinggi), 65 th (fungsional utama)
 * TMT Pensiun: Tanggal 1 bulan berikutnya setelah ulang tahun BUP
 * (Kecuali jika lahir tanggal 1, maka TMT pensiun tanggal 1 bulan itu)
 */
export function calculatePensiunTarget(
  tanggalLahir: string,
  jenisJabatan: JenisJabatan,
  bupPerJabatan: Record<JenisJabatan, number>
): string {
  const birth = parseDate(tanggalLahir);
  const bupAge = bupPerJabatan[jenisJabatan] || 58;
  const bupYear = birth.getFullYear() + bupAge;
  const birthMonth = birth.getMonth(); // 0-indexed
  const birthDay = birth.getDate();

  if (birthDay === 1) {
    // If born on the 1st, retirement is 1st of birth month
    return `${bupYear}-${String(birthMonth + 1).padStart(2, '0')}-01`;
  } else {
    // If born after the 1st, retirement is 1st of following month
    const retirementDate = new Date(bupYear, birthMonth + 1, 1);
    return formatDate(retirementDate);
  }
}

/**
 * Deterministic status evaluation per PRD Section 9.2 & 18
 */
export function evaluateEWSStatus(
  layanan: JenisLayanan,
  targetDateStr: string,
  todayStr: string,
  isFinished: boolean,
  param: ParameterConfig
): { tingkat: EWSStatus; sisaHari: number } {
  if (isFinished) {
    return { tingkat: 'Selesai', sisaHari: 0 };
  }

  const target = parseDate(targetDateStr).getTime();
  const today = parseDate(todayStr).getTime();
  const sisaHari = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (sisaHari < 0) {
    return { tingkat: 'Terlambat', sisaHari };
  }

  let ambang: number[] = [75, 60, 30, 15];
  if (layanan === 'KGB') ambang = param.ambangKGB;
  else if (layanan === 'KP') ambang = param.ambangKP;
  else if (layanan === 'Pensiun') ambang = param.ambangPensiun;
  else if (layanan === 'PPPK') ambang = param.ambangPPPK;

  // ambang sorted descending, e.g. [75, 60, 30, 15]
  // Labels: [Persiapan, Perhatian, Mendesak, Kritis]
  const labels: EWSStatus[] = ['Persiapan', 'Perhatian', 'Mendesak', 'Kritis'];

  if (sisaHari <= ambang[3]) return { tingkat: labels[3], sisaHari };
  if (sisaHari <= ambang[2]) return { tingkat: labels[2], sisaHari };
  if (sisaHari <= ambang[1]) return { tingkat: labels[1], sisaHari };
  if (sisaHari <= ambang[0]) return { tingkat: labels[0], sisaHari };

  return { tingkat: 'Aman', sisaHari };
}

/**
 * Calculate Working Days between two dates, excluding weekends and official holidays
 */
export function calculateWorkDays(
  startDateStr: string,
  endDateStr: string,
  hariLibur: HariLibur[]
): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  if (start > end) return 0;

  const holidaySet = new Set(hariLibur.map(h => h.tanggal));
  let count = 0;
  const curr = new Date(start);

  while (curr <= end) {
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
    const dateStr = formatDate(curr);

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }

  return count;
}

/**
 * Validate Indonesian Civil Servant NIP (18-digit)
 * Structure: YYYYMMDD (lahir) + YYYYMM (CPNS) + G (jenis kelamin: 1 pria, 2 wanita) + NNN (nomor urut)
 */
export function validateNIP(nip: string): { isValid: boolean; message: string } {
  const cleanNip = (nip || '').replace(/\D/g, '');
  if (cleanNip.length !== 18) {
    return { isValid: false, message: 'NIP harus terdiri dari 18 digit angka.' };
  }
  const yearBirth = parseInt(cleanNip.slice(0, 4), 10);
  const monthBirth = parseInt(cleanNip.slice(4, 6), 10);
  const dayBirth = parseInt(cleanNip.slice(6, 8), 10);
  if (yearBirth < 1940 || yearBirth > 2010 || monthBirth < 1 || monthBirth > 12 || dayBirth < 1 || dayBirth > 31) {
    return { isValid: false, message: 'Format tanggal lahir pada 8 digit pertama NIP tidak valid.' };
  }
  return { isValid: true, message: 'NIP valid (18 digit).' };
}

/**
 * Anonymize / Mask sensitive data (NIP, NIK, Full Name) for AI calls per UU PDP
 */
export function maskSensitiveData(content: string): string {
  return content
    .replace(/\b(19\d{16}|20\d{16})\b/g, '19XXXXXXXXXXXXXX')
    .replace(/\b(3305\d{12})\b/g, '3305XXXXXXXXXXXX') // Kebumen NIK prefix
    .replace(/\b(08[1-9]\d{7,10})\b/g, '08XXXXXXXXXX');
}

/**
 * Generate EWS list for all active employees
 */
export function generateEWSList(
  pegawaiList: Pegawai[],
  dokumenList: DokumenRecord[],
  params: ParameterConfig,
  currentDateStr: string = '2026-11-04'
): EWSItem[] {
  const items: EWSItem[] = [];

  for (const p of pegawaiList) {
    if (!p.statusAktif) continue;

    // Check document verification status for this employee
    const pDocs = dokumenList.filter(d => d.nip === p.nip);
    const hasDiscrepancy = pDocs.some(d => d.statusVerifikasi === 'Selisih');
    const hasUnverified = pDocs.length === 0 || pDocs.some(d => d.statusVerifikasi === 'Belum terverifikasi');
    const docStatus = hasDiscrepancy ? 'Selisih' : hasUnverified ? 'Belum terverifikasi' : 'Sesuai';

    // 1. KGB Service (For PNS and eligible)
    if (p.tmtKgbTerakhir) {
      const targetKgb = calculateKgbTarget(p.tmtKgbTerakhir);
      const evalKgb = evaluateEWSStatus('KGB', targetKgb, currentDateStr, false, params);
      
      items.push({
        id: `EWS-KGB-${p.nip}`,
        nip: p.nip,
        namaPegawai: p.nama,
        jabatan: p.jabatan,
        unitKerja: p.unitKerja,
        jenisLayanan: 'KGB',
        tanggalTarget: targetKgb,
        sisaHari: evalKgb.sisaHari,
        tingkat: evalKgb.tingkat,
        statusUsulan: evalKgb.sisaHari < 0 ? 'Belum Diproses' : evalKgb.sisaHari <= 30 ? 'Sedang Verifikasi Berkas' : 'Belum Diproses',
        statusVerifikasiDokumen: docStatus,
        keterangan: `TMT Terakhir: ${p.tmtKgbTerakhir}. Siklus 2 tahunan berkala.`,
        kontak: { email: p.email, wa: p.nomorWhatsApp },
        riwayatTMTLama: p.tmtKgbTerakhir
      });
    }

    // 2. KP Service (Only for PNS)
    if (p.jenisKepegawaian === 'PNS' && p.tmtPangkatTerakhir) {
      const targetKp = calculateKpTarget(p.tmtPangkatTerakhir, params.periodeKP);
      const evalKp = evaluateEWSStatus('KP', targetKp, currentDateStr, false, params);

      items.push({
        id: `EWS-KP-${p.nip}`,
        nip: p.nip,
        namaPegawai: p.nama,
        jabatan: p.jabatan,
        unitKerja: p.unitKerja,
        jenisLayanan: 'KP',
        tanggalTarget: targetKp,
        sisaHari: evalKp.sisaHari,
        tingkat: evalKp.tingkat,
        statusUsulan: evalKp.sisaHari < 0 ? 'Belum Diproses' : evalKp.sisaHari <= 60 ? 'Sedang Verifikasi Berkas' : 'Belum Diproses',
        statusVerifikasiDokumen: docStatus,
        keterangan: `Pangkat saat ini: ${p.pangkatGolongan}. TMT Pangkat: ${p.tmtPangkatTerakhir}. Periode usul terdekat.`,
        kontak: { email: p.email, wa: p.nomorWhatsApp },
        riwayatTMTLama: p.tmtPangkatTerakhir
      });
    }

    // 3. Pensiun BUP (PNS)
    if (p.jenisKepegawaian === 'PNS' && p.tanggalLahir) {
      const targetPensiun = calculatePensiunTarget(p.tanggalLahir, p.jenisJabatan, params.bupPerJabatan);
      const evalPensiun = evaluateEWSStatus('Pensiun', targetPensiun, currentDateStr, false, params);

      // Only show in EWS if within 365 days or already overdue
      if (evalPensiun.sisaHari <= 365) {
        items.push({
          id: `EWS-PENSIUN-${p.nip}`,
          nip: p.nip,
          namaPegawai: p.nama,
          jabatan: p.jabatan,
          unitKerja: p.unitKerja,
          jenisLayanan: 'Pensiun',
          tanggalTarget: targetPensiun,
          sisaHari: evalPensiun.sisaHari,
          tingkat: evalPensiun.tingkat,
          statusUsulan: evalPensiun.sisaHari < 0 ? 'Belum Diproses' : evalPensiun.sisaHari <= 90 ? 'Sedang Verifikasi Berkas' : 'Belum Diproses',
          statusVerifikasiDokumen: docStatus,
          keterangan: `BUP ${params.bupPerJabatan[p.jenisJabatan] || 58} th (${p.jenisJabatan}). Lahir: ${p.tanggalLahir}.`,
          kontak: { email: p.email, wa: p.nomorWhatsApp },
          riwayatTMTLama: p.tanggalLahir
        });
      }
    }

    // 4. PPPK Contract Expiry (PPPK)
    if (p.jenisKepegawaian === 'PPPK' && p.tmtPerjanjianSelesai) {
      const evalPppk = evaluateEWSStatus('PPPK', p.tmtPerjanjianSelesai, currentDateStr, false, params);
      items.push({
        id: `EWS-PPPK-${p.nip}`,
        nip: p.nip,
        namaPegawai: p.nama,
        jabatan: p.jabatan,
        unitKerja: p.unitKerja,
        jenisLayanan: 'PPPK',
        tanggalTarget: p.tmtPerjanjianSelesai,
        sisaHari: evalPppk.sisaHari,
        tingkat: evalPppk.tingkat,
        statusUsulan: 'Belum Diproses',
        statusVerifikasiDokumen: docStatus,
        keterangan: `Masa Perjanjian Kerja Berakhir pada ${p.tmtPerjanjianSelesai}.`,
        kontak: { email: p.email, wa: p.nomorWhatsApp },
        riwayatTMTLama: p.tmtPangkatTerakhir
      });
    }
  }

  // Sort by urgency: Terlambat first, then Kritis, Mendesak, Perhatian, Persiapan, Aman
  const priorityOrder: Record<EWSStatus, number> = {
    'Terlambat': 0,
    'Kritis': 1,
    'Mendesak': 2,
    'Perhatian': 3,
    'Persiapan': 4,
    'Aman': 5,
    'Selesai': 6
  };

  return items.sort((a, b) => {
    const diff = priorityOrder[a.tingkat] - priorityOrder[b.tingkat];
    if (diff !== 0) return diff;
    return a.sisaHari - b.sisaHari;
  });
}
