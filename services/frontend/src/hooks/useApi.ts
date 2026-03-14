'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '@/sdk/apiClient';

// ============================================================================
// useApiQuery – declarative data fetching with loading / error / refetch
// ============================================================================

export interface UseApiQueryResult<T> {
  /** The resolved data, or null while loading / on error. */
  data: T | null;
  /** True while the request is in-flight. */
  loading: boolean;
  /** A human-readable error message, or null on success. */
  error: string | null;
  /** The full ApiError instance if the last request failed. */
  apiError: ApiError | null;
  /** Re-execute the fetcher. Resets error state automatically. */
  refetch: () => void;
}

/**
 * Declaratively fetch data from an API endpoint.
 *
 * @param fetcher  An async function that returns `T`.
 * @param deps     Dependency array – the fetcher is re-invoked whenever deps change.
 *                 Pass an empty array to fetch only on mount.
 *
 * @example
 * ```ts
 * const { data, loading, error, refetch } = useApiQuery(
 *   () => risk.getAssessments({ page: 1 }),
 *   [page],
 * );
 * ```
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  // Keep a ref to the latest fetcher so we can call it from refetch()
  // without adding it to the effect dependency list.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Monotonically increasing request counter to avoid stale responses.
  const requestId = useRef(0);

  const execute = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setApiError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (id === requestId.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (id === requestId.current) {
          if (err instanceof ApiError) {
            setError(err.message);
            setApiError(err);
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred');
          }
          setLoading(false);
        }
      });
  }, []); // stable – relies on refs only

  // Re-run whenever deps change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { execute(); }, [...deps, execute]);

  return { data, loading, error, apiError, refetch: execute };
}

// ============================================================================
// useApiMutation – imperative mutations with loading / error state
// ============================================================================

export interface UseApiMutationResult<T, P> {
  /** Trigger the mutation. Returns the resolved data on success. */
  mutate: (params: P) => Promise<T>;
  /** The data returned by the last successful mutation, or null. */
  data: T | null;
  /** True while the mutation is in-flight. */
  loading: boolean;
  /** A human-readable error message from the last attempt, or null. */
  error: string | null;
  /** The full ApiError instance from the last attempt, or null. */
  apiError: ApiError | null;
  /** Reset state back to idle (clears data, error). */
  reset: () => void;
}

/**
 * Imperatively execute a mutation (POST / PUT / DELETE) with managed state.
 *
 * @param mutator  An async function that accepts `P` and returns `T`.
 *
 * @example
 * ```ts
 * const { mutate, loading, error } = useApiMutation(
 *   (params: CreateAssessmentRequest) => risk.createAssessment(params),
 * );
 *
 * async function handleSubmit(values: CreateAssessmentRequest) {
 *   try {
 *     const result = await mutate(values);
 *     console.log('Created:', result);
 *   } catch {
 *     // error state is already set – render it from the hook
 *   }
 * }
 * ```
 */
export function useApiMutation<T, P = void>(
  mutator: (params: P) => Promise<T>,
): UseApiMutationResult<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  const mutatorRef = useRef(mutator);
  mutatorRef.current = mutator;

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setApiError(null);
  }, []);

  const mutate = useCallback(async (params: P): Promise<T> => {
    setLoading(true);
    setError(null);
    setApiError(null);

    try {
      const result = await mutatorRef.current(params);
      setData(result);
      setLoading(false);
      return result;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        setApiError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      setLoading(false);
      throw err; // Re-throw so callers can catch if needed
    }
  }, []);

  return { mutate, data, loading, error, apiError, reset };
}
