/**
 * Halaman utama wizard onboarding first-run.
 *
 * Pola interaksi: setiap step diakses lewat `ref` yang mengexpose
 * `OnboardingStepHandle.submit()`. Tombol Lanjut/Selesai di footer akan
 * memanggil submit step aktif; bila berhasil, wizard maju ke step
 * berikutnya (atau menutup wizard untuk step terakhir). Bila gagal,
 * step tetap di posisi semula dengan error inline.
 *
 * Tombol "Kembali" tidak menyimpan — diasumsikan user memang ingin
 * meninggalkan perubahan di step ini.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthContext";
import { OnboardingShell } from "@/features/onboarding/components/OnboardingShell";
import { OnboardingStepFooter } from "@/features/onboarding/components/OnboardingStepFooter";
import { OnboardingWelcome } from "@/features/onboarding/components/OnboardingWelcome";
import { onboardingComplete } from "@/features/onboarding/onboardingApi";
import { useOnboardingChecklist } from "@/features/onboarding/useOnboardingChecklist";
import { useOnboardingFlow } from "@/features/onboarding/useOnboardingFlow";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";
import { StepInfoPerusahaan } from "@/features/onboarding/steps/StepInfoPerusahaan";
import { StepPeriodePembukuan } from "@/features/onboarding/steps/StepPeriodePembukuan";
import { StepCoA } from "@/features/onboarding/steps/StepCoA";
import { StepGudang } from "@/features/onboarding/steps/StepGudang";
import { StepAkunAdmin } from "@/features/onboarding/steps/StepAkunAdmin";
import { StepModulBisnis } from "@/features/onboarding/steps/StepModulBisnis";
import { StepSelesai } from "@/features/onboarding/steps/StepSelesai";
import { tauriErrorMessage } from "@/lib/tauriError";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const { checklist, loading: checklistLoading, refresh: refreshChecklist } =
    useOnboardingChecklist();
  const flow = useOnboardingFlow(checklist);
  const stepRef = useRef<OnboardingStepHandle | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Welcome screen di-render setiap kali user masuk ke wizard, hingga
   * mereka eksplisit klik "Mulai". State ini di-reset pada tiap
   * mount (page reload / app restart) — disengaja, karena Welcome
   * berperan sebagai "ruang transisi" yang mengonfirmasi user benar-benar
   * siap melanjutkan setup, bukan sekadar onboarding sekali untuk satu
   * mesin. Posisi step aktif setelah klik Mulai ditentukan oleh
   * `useOnboardingFlow` (auto-skip ke step pertama yang belum done),
   * jadi user yang sudah maju 4/5 tidak akan diulang dari step 1.
   */
  const [sudahKlikMulai, setSudahKlikMulai] = useState(false);

  /**
   * Step `selesai` adalah momen closing — bukan kerjaan yang punya
   * status done/belum. Mengecualikannya dari hitungan progress
   * membuat user yang sampai di step terakhir melihat 100% (semua
   * kerjaan kelar), bukan ~86% yang terasa tanggung.
   */
  const stepsKerjaan = useMemo(
    () => flow.steps.filter((s) => s.id !== "selesai"),
    [flow.steps],
  );
  const doneCount = useMemo(
    () => stepsKerjaan.reduce((acc, s) => acc + (checklist[s.id] ? 1 : 0), 0),
    [checklist, stepsKerjaan],
  );

  const tampilkanWelcome = !checklistLoading && !sudahKlikMulai;

  const handleNext = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = (await stepRef.current?.submit()) ?? true;
      if (ok) flow.goNext();
    } catch (e) {
      toast.error(tauriErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, flow]);

  const handleFinish = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = (await stepRef.current?.submit()) ?? true;
      if (!ok) {
        // Validasi gagal di step terakhir, footer akan menampilkan
        // error inline; jangan call onboardingComplete.
        return;
      }
      // Re-ambil checklist freshness untuk yakin semua step wajib done.
      await refreshChecklist();
      await onboardingComplete({
        completedBy: session?.username ?? null,
      });
      toast.success(
        "Pengaturan awal selesai. Silakan masuk dengan akun admin Anda.",
      );
      // Setelah onboarding:
      //  1. Kredensial admin kemungkinan baru saja diubah di step "Akun
      //     admin" (username & password). Sesi yang aktif sekarang
      //     menyimpan identitas lama — bisa stale / tidak valid lagi.
      //  2. `OnboardingGate` adalah parent dari rute `/onboarding` dan
      //     `/`, sehingga ia tidak unmount saat navigate antar keduanya.
      //     Akibatnya `useOnboardingStatus` di gate masih memegang
      //     cache `completed=false` dan akan melempar user balik ke
      //     wizard meski backend sudah completed.
      //
      // Logout memutus sesi lama dan saat user kembali login, semua
      // hook (termasuk gate) di-mount ulang dengan status terbaru —
      // user akan langsung ke dashboard tanpa loop.
      logout();
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(tauriErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, logout, navigate, refreshChecklist, session?.username]);

  /**
   * Shortcut Enter pada step "Selesai" — komitmen user dengan satu tap
   * di keyboard, tanpa harus meraih mouse. Diabaikan bila fokus berada
   * di input/textarea/contenteditable (jadi tidak mengganggu form-form
   * step lain bila bug navigasi tiba-tiba membawa fokus ke step bukan
   * selesai), bila ada modifier Ctrl/Meta/Alt, atau saat wizard sedang
   * busy/welcome.
   */
  useEffect(() => {
    if (sudahKlikMulai !== true) return;
    if (flow.current?.id !== "selesai") return;

    function isEditable(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function onKey(ev: KeyboardEvent) {
      if (ev.key !== "Enter") return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (isEditable(ev.target)) return;
      ev.preventDefault();
      void handleFinish();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flow.current?.id, handleFinish, sudahKlikMulai]);

  const renderStep = () => {
    if (checklistLoading && !flow.current) {
      return <p className="text-sm text-zinc-500">Memuat status onboarding…</p>;
    }
    switch (flow.current?.id) {
      case "info-perusahaan":
        return <StepInfoPerusahaan ref={stepRef} onSaved={refreshChecklist} />;
      case "periode-pembukuan":
        return <StepPeriodePembukuan ref={stepRef} onSaved={refreshChecklist} />;
      case "coa":
        return <StepCoA ref={stepRef} onSaved={refreshChecklist} />;
      case "gudang":
        return <StepGudang ref={stepRef} onSaved={refreshChecklist} />;
      case "password-admin":
        return <StepAkunAdmin ref={stepRef} onSaved={refreshChecklist} />;
      case "modul-bisnis":
        return <StepModulBisnis ref={stepRef} onSaved={refreshChecklist} />;
      case "selesai":
        return (
          <StepSelesai ref={stepRef} checklist={checklist} onSaved={refreshChecklist} />
        );
      default:
        return null;
    }
  };

  if (tampilkanWelcome) {
    return (
      <OnboardingWelcome
        namaPengguna={session?.namaLengkap ?? session?.username ?? null}
        onMulai={() => setSudahKlikMulai(true)}
      />
    );
  }

  return (
    <OnboardingShell
      activeId={flow.current?.id ?? flow.steps[0].id}
      checklist={checklist}
      onSelectStep={flow.goTo}
      doneCount={doneCount}
      totalCount={stepsKerjaan.length}
    >
      <div className="flex flex-1 flex-col gap-6">{renderStep()}</div>

      <OnboardingStepFooter
        isFirst={flow.isFirst}
        isLast={flow.isLast}
        busy={busy}
        onBack={flow.goBack}
        onNext={handleNext}
        onFinish={handleFinish}
        hint={
          flow.current?.id === "selesai"
            ? "Tekan Enter atau klik Selesai untuk masuk aplikasi."
            : flow.current?.wajib
              ? "Klik Lanjut untuk menyimpan dan melanjutkan."
              : "Klik Lanjut untuk melewati atau menyimpan."
        }
      />
    </OnboardingShell>
  );
}
