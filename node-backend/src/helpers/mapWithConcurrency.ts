export const mapWithConcurrency = async <TValue, TResult>(values: TValue[], concurrency: number, task: (value: TValue) => Promise<TResult>): Promise<TResult[]> => {
  const results = new Array<TResult>(values.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(values[index]);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => worker(),
    ),
  );

  return results;
};
