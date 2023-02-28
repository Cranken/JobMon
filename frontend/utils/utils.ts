import { useState } from "react";
import { useEffect } from "react";
import { useCookies } from "react-cookie";
import { DataMap, JobListData, JobTag } from "../types/job";
import { JobSearchParams } from "../types/job";

/**
 * Clamps the value of val between min and max.
 * @param val The original value.
 * @param min The minimum value.
 * @param max The maximum value.
 * @returns The original val, in case it is contained in [min,max]. Otherwise, either to min or max value is returned.
 */
export const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

/**
 * Checks if point is between d1 and d2.
 * @param d1 The lower limit.
 * @param d2 The upper limit.
 * @param point The point to check.
 * @returns True if point is in [d1,d2].
 */
export function checkBetween<T>(d1: T, d2: T, point: T) {
  return d1 <= point && point <= d2;
}

/**
 * Stores element in browser storage.
 * Localstorage data has no expiration time, so the stored data is saved across browser sessions.
 * @param key The key for the element.
 * @param value The value to store.
 * @returns Returns four elements,
 *          the state of the stored element,
 *          a function to modify the value,
 *          a function to remove the item from the browser storage and
 *          a state that indicates if browser storage was already checked for existing values.
 */
export function useStorageState<T>(
  key: string,
  value: T
): [T, (value: T) => void, () => void, boolean] {
  const [state, setState] = useState(value);
  const [isLoading, setIsLoading] = useState(true);

  const setStorageState = (value: T) => {
    if (typeof window !== "undefined") {
      const string = JSON.stringify(value);
      localStorage.setItem(key, string);
      setState(value);
    }
  };

  const clearState = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  };

  //Check if item with the same key already exists in localstorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(key);
      if (saved) {
        const value = JSON.parse(saved) as T;
        setState(value);
      }

      //Indicate that values are ready
      setIsLoading(false);
    }
  }, [key]);

  return [state, setStorageState, clearState, isLoading];
}

/**
 * Fetches Jobs from the backend.
 * @param params The parameters to restrict the jobs returned by the backend.
 *                If no parameters are given, the method will not fetch from the backend.
 * @returns A set of jobs returned from the backend and a state object indicating if the request to the backend is finished.
 */
export const useGetJobs: (
  params?: JobSearchParams
) => [JobListData | undefined, boolean] = (params?: JobSearchParams) => {
  const [jobListData, setJobs] = useState<JobListData>();
  const [, , removeCookie] = useCookies(["Authorization"]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setIsLoading(true);
    const url = new URL(
      "http://" + process.env.NEXT_PUBLIC_BACKEND_URL + "/api/jobs"
    );

    //Parse params
    if (params) {
      Object.keys(params).forEach((val) => {
        if (val === "Tags") {
          const ids = params.Tags?.map((t) => t.Id);
          url.searchParams.append(val, ids?.toString() ?? "");
        } else {
          const paramVal = params[val as keyof JobSearchParams]?.toString();
          if (paramVal !== undefined && paramVal !== "") {
            url.searchParams.append(val, paramVal);
          }
        }
      });
    } else {
      return;
    }

    //Fetching and parsing results from the backend
    fetch(url.toString(), {
      credentials: "include",
    }).then((res) => {
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        removeCookie("Authorization");
      } else {
        res.json().then((data) => {
          setJobs(data);
          setIsLoading(false);
        });
      }
    });
  }, [removeCookie, params]);
  return [jobListData, isLoading];
};

/**
 * Groups data with a key function.
 * @param data The data to group.
 * @param keyFunc The key function. The key function is used to generate keys for given objects.
 * @returns Returns an array with all elements from data. Each element in the result has a key, determined with the key function.
 */
export function groupBy<T>(
  data: T[],
  keyFunc: (obj: T) => string
): DataMap<T[]> {
  const groups: DataMap<T[]> = {};
  data.forEach((obj) => {
    const key = keyFunc(obj);
    if (key in groups) {
      groups[key].push(obj);
    } else {
      groups[key] = [obj];
    }
  });
  return groups;
}

/**
 * Adds a tag to the given job.
 * @param jobId The jobId is used to identify the job to which the tag should be added.
 * @param tag The tag.
 */
export const addJobTag = (jobId: number, tag: string) => {
  const url = new URL(
    "http://" +
    process.env.NEXT_PUBLIC_BACKEND_URL +
    `/api/tags/add_tag?job=${jobId}`
  );

  return setJobTag(url.toString(), { Name: tag } as JobTag);
};

/**
 * Removes a tag from the given job.
 * @param jobId The jobId is used to identify the job to from which the tag should be removed.
 * @param tag The tag.
 */
export const removeJobTag = (jobId: number, tag: JobTag) => {
  const url = new URL(
    "http://" +
    process.env.NEXT_PUBLIC_BACKEND_URL +
    `/api/tags/remove_tag?job=${jobId}`
  );

  return setJobTag(url.toString(), tag);
};

/**
 * Calls the backend api to modify tags.
 * @param url The url to call. Additionally, to the backend's address the url specifies which operation will be executed.
 * @param tag The tag.
 */
const setJobTag = (url: string, tag: JobTag) => {
  return fetch(url, {
    credentials: "include",
    method: "POST",
    body: JSON.stringify(tag),
  });
};

/**
 * Converts a date-object into unix-time.
 * @param d The date to convert.
 * @returns The corresponding unix-time.
 */
export const dateToUnix = (d: Date) => {
  return parseInt((d.getTime() / 1000).toFixed(0));
};
