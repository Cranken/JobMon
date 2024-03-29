import {
  useState,
  useEffect
} from "react";
import { useCookies } from "react-cookie";
import { DataMap, JobListData, JobTag, JobSearchParams } from "@/types/job";
import { useBreakpointValue, useToast } from "@chakra-ui/react";


export const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

export function checkBetween<T>(d1: T, d2: T, point: T) {
  return d1 <= point && point <= d2;
}

/**
 * Constructs an element in the session-storage
 * @param key The key to store the element under
 * @param value The initial value
 * @returns Functions to read and modify the element in the session-storage
 */
export function useSessionStorageState<T>(
    key: string,
    value: T
): [T, (value: T) => void, () => void, boolean] {
  const [state, setState] = useState(value);
  const [isLoading, setIsLoading] = useState(true);

  const setStorageState = (value: T) => {
    if (typeof window !== "undefined") {
      const string = JSON.stringify(value);
      sessionStorage.setItem(key, string);
      setState(value);
    }
  };

  const clearState = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(key);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const value = JSON.parse(saved) as T;
        setState(value);
      }
      else {
        setStorageState(value);
      }
      setIsLoading(false);
    }
  }, [key]);

  return [state, setStorageState, clearState, isLoading];
}

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(key);
      if (saved) {
        const value = JSON.parse(saved) as T;
        setState(value);
      }
      setIsLoading(false);
    }
  }, [key]);

  return [state, setStorageState, clearState, isLoading];
}

export const useGetJobs: (
  params?: JobSearchParams
) => [JobListData | undefined, boolean] = (params?: JobSearchParams) => {
  const [jobListData, setJobs] = useState<JobListData>();
  const [, , removeCookie] = useCookies(["Authorization"]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setIsLoading(true);
    const url = new URL(
      process.env.NEXT_PUBLIC_BACKEND_URL + "/api/jobs"
    );
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

export const addJobTag = (jobId: number, tag: string) => {
  const url = new URL(
    process.env.NEXT_PUBLIC_BACKEND_URL +
    `/api/tags/add_tag?job=${jobId}`
  );

  return setJobTag(url.toString(), { Name: tag } as JobTag);
};

export const removeJobTag = (jobId: number, tag: JobTag) => {
  const url = new URL(
    process.env.NEXT_PUBLIC_BACKEND_URL +
    `/api/tags/remove_tag?job=${jobId}`
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

export const dateToUnix = (d: Date) => {
  return parseInt((d.getTime() / 1000).toFixed(0));
};

/**
 * Adds a resize listener to the window prop.#
 * In case the size-breakpoint can not be read, this hook classifies the device as wide per default.
 * @returns A state to declare a device as wide or not
 */
export const useIsWideDevice = () => {
  const isWideDevice = useBreakpointValue(
    {
      base: false,
      lg: true,
    },
    {
      fallback: 'lg',
    },
  )

    return (isWideDevice != undefined) ? isWideDevice : true;
}

