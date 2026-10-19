// What narrows «Мої заявки»: a year, a month and free text over dancers,
// trainers and competitions. The order is
// always the server's: nearest competitions first. An empty value means
// «all».
export interface MyEntriesFilter {
  // 'YYYY' of the competition's start; empty means «all».
  year: string;
  // 'MM' of the competition's start; empty means «all».
  month: string;
  query: string;
}

export interface MyEntriesFilterOption {
  value: string;
  label: string;
}

// Receives every change the filter bar makes.
export interface MyEntriesFilterController {
  change(next: MyEntriesFilter): void;
}
