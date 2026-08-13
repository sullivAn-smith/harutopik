export type CurriculumSeriesId = "1" | "2" | "3";

export type CurriculumSeriesTheme = "blue" | "cyan" | "green";

export type CurriculumSeriesDefinition = {
  id: CurriculumSeriesId;
  bookCount: number;
  theme: CurriculumSeriesTheme;
  href: `/thu-vien/${CurriculumSeriesId}`;
  coverAsset: string | null;
};

export const curriculumSeriesDefinitions = [
  {
    id: "1",
    bookCount: 6,
    theme: "blue",
    href: "/thu-vien/1",
    coverAsset: null,
  },
  {
    id: "2",
    bookCount: 6,
    theme: "cyan",
    href: "/thu-vien/2",
    coverAsset: "/covers/harutopik-color-series-v2.png",
  },
  {
    id: "3",
    bookCount: 8,
    theme: "green",
    href: "/thu-vien/3",
    coverAsset: "/covers/harutopik-geometry-series.png",
  },
] as const satisfies readonly CurriculumSeriesDefinition[];

export function getCurriculumSeries(seriesId: string) {
  return curriculumSeriesDefinitions.find((series) => series.id === seriesId);
}
