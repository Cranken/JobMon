import { useState } from "react";
import { useEffect } from "react";
import { useCookies } from "react-cookie";
import { DataMap, JobListData, JobTag } from "../types/job";

export const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

export function checkBetween<T>(d1: T, d2: T, point: T) {
  return d1 <= point && point <= d2;
}

export function useStorageState<T>(
  key: string,
  value: T
): [T, (value: T) => void, () => void] {
  const [state, setState] = useState(value);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(key);
      if (saved) {
        const value = JSON.parse(saved) as T;
        setState(value);
      }
    }
  }, [key]);

  return [state, setStorageState, clearState];
}

export const useGetJobs = () => {
  const [jobListData, setJobs] = useState<JobListData>();
  const [_c, _s, removeCookie] = useCookies(["Authorization"]);
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/jobs", {
      credentials: "include",
    }).then((res) => {
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        removeCookie("Authorization");
      } else {
        res.json().then((data) => setJobs(data));
      }
    });
  }, [removeCookie]);
  return jobListData;
};

export function groupBy<T>(
  data: T[],
  keyFunc: (obj: T) => string
): DataMap<T[]> {
  let groups: DataMap<T[]> = {};
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

export const addJobTag = (jobId: number, tag: JobTag) => {
  const url = new URL(
    process.env.NEXT_PUBLIC_BACKEND_URL + `/api/tags/add_tag?job=${jobId}`
  );

  return setJobTag(url.toString(), tag);
};

export const removeJobTag = (jobId: number, tag: JobTag) => {
  const url = new URL(
    process.env.NEXT_PUBLIC_BACKEND_URL + `/api/tags/remove_tag?job=${jobId}`
  );

  return setJobTag(url.toString(), tag);
};

const setJobTag = (url: string, tag: JobTag) => {
  return fetch(url, {
    credentials: "include",
    method: "POST",
    body: JSON.stringify(tag),
  });
};
