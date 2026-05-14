export type MerekRow = {
  kode: string;
  nama: string;
  deskripsi: string;
};

export const mockMerek: MerekRow[] = [
  {
    kode: "MRK-001",
    nama: "Sony",
    deskripsi: "Elektronik dan audio.",
  },
  {
    kode: "MRK-002",
    nama: "Samsung",
    deskripsi: "",
  },
  {
    kode: "MRK-003",
    nama: "Uniqlo",
    deskripsi: "Ritel fashion global.",
  },
];
