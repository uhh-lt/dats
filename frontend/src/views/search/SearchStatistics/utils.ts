export const sortStats = (statsOrder: string, stats: any[], totalCountMap: Map<any, number>, attrGetter: Function) => {
  if (statsOrder === "total") {
    stats.sort((a, b) => {
      let totalA = totalCountMap.get(attrGetter(a))!;
      let totalB = totalCountMap.get(attrGetter(b))!;
      return totalA > totalB ? -1 : totalB > totalA ? 1 : a.count > b.count ? -1 : b.count > a.count ? 1 : 0;
    });
  } else {
    stats.sort((a, b) => {
      if (a.count > b.count) {
        return -1;
      } else if (b.count > a.count) {
        return 1;
      } else {
        let totalA = totalCountMap.get(attrGetter(a))!;
        let totalB = totalCountMap.get(attrGetter(b))!;
        return totalA > totalB ? 1 : totalB > totalA ? -1 : 0;
      }
    });
  }
};
