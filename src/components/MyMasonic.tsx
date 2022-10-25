/* eslint-disable react/no-children-prop */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useWindowSize } from "@react-hook/window-size";
import { Masonry, useInfiniteLoader } from "masonic";

import Post from "./Post";
import { localSeen, useMainContext } from "../MainContext";
// import { usePlausible } from "next-plausible";
import { UseInfiniteQueryResult } from "react-query";

import toast, { ToastIcon } from "react-hot-toast";
import ToastCustom from "./toast/ToastCustom";
import useRefresh from "../hooks/useRefresh";
import useFeedGallery from "../hooks/useFeedGallery";
import { InView } from "react-intersection-observer";
import useHeightMap from "../hooks/useHeightMap";
import { findGreatestsImages, findOptimalImageIndex } from "../../lib/utils";
import useGlobalState from "../hooks/useGlobalState";
import PostModal from "./PostModal";
import { useRouter } from "next/router";
import MasonicStatic from "./MasonicStatic";
import Spinner from "./ui/Spinner";

interface MyMasonicProps {
  initItems: any[];
  curKey: any;
  feed: UseInfiniteQueryResult<
    {
      filtered: any;
      after: any;
      count: any;
      prevPosts: any;
    },
    unknown
  >;
}

const MyMasonic = ({ initItems, feed, curKey }: MyMasonicProps) => {
  const context: any = useMainContext();
  const { setFeedData } = useFeedGallery();

  const [cols, setCols] = useState(3);
  const [uniformMediaMode, setUniformMediaMode] = useState<boolean>();
  const [masonicKey, setMasonicKey] = useState(curKey);
  const [windowWidth, windowHeight] = useWindowSize();

  useEffect(() => {
    if (context.cardStyle == "row1") {
      setCols(1);
    } else if (context?.columnOverride !== 0) {
      setCols(context.columnOverride);
    } else if (!context.postOpen) {
      //prevent layout shift when resize with post open
      if (windowWidth > 1920) {
        setCols(5);
      } else if (windowWidth > 1400) {
        setCols(4);
      } else if (windowWidth > 1000) {
        setCols(3);
      } else if (windowWidth > 767) {
        setCols(2);
      } else {
        setCols(1);
      }
    }
    return () => {};
  }, [windowWidth, context.columnOverride, context.cardStyle]);

  useEffect(() => {
    context.setColumns(cols);
  }, [cols]);
  useEffect(() => {
    if (context.mediaOnly && cols > 1 && context.uniformHeights) {
      setUniformMediaMode(true);
    } else {
      setUniformMediaMode(false);
    }
  }, [cols, context.mediaOnly, context.uniformHeights]);

  const [items, setItems] = useState<any[]>([]);
  const [newPosts, setNewPosts] = useState<any[]>([]);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const domain = window?.location?.hostname;

    const updatePostsInPlace = (newPosts, appendNewPosts = false) => {
      setItems((pposts) => {
        let newPostCount = 0;
        let pPostMap = new Map();
        let newPostArr = [] as any[];
        pposts.forEach((p) => pPostMap.set(p?.data?.name, p));
        newPosts.forEach((np) => {
          let prevPost = pPostMap.get(np?.data?.name);
          if (prevPost?.data?.name) {
            pPostMap.set(prevPost?.data?.name, np);
          } else {
            newPostCount += 1;
            newPostArr.push(np);
          }
        });
        if (appendNewPosts) {
          return [...Array.from(pPostMap.values()), ...newPostArr];
        }
        setNewPostsCount(newPostCount);
        setNewPosts(() => (newPostCount > 0 ? newPosts : []));
        return Array.from(pPostMap.values());
      });
    };

    const check = (d) => {
      setChecked(true);
      let isBlocked = false;
      let c = 0;
      let p = process.env.NEXT_PUBLIC_CHECK;
      let r = process.env.NEXT_PUBLIC_R as string;
      let l = JSON.parse(process.env.NEXT_PUBLIC_OKLIST ?? "[]")?.map(
        (s: string) => s.toUpperCase()
      ) as string[];
      d.forEach((i) => {
        if (
          i?.data?.[`${p}`] === true &&
          !l.includes(i?.data?.subreddit?.toUpperCase())
        ) {
          c++;
        }
      });
      if (c / d.length > 0.9) {
        isBlocked = true;
        setBlocked(true);
        const t = toast.custom(
          (t) => (
            <ToastCustom
              t={t}
              message={`${process.env.NEXT_PUBLIC_M}`}
              mode={"alert"}
              action={() => {
                window.location.href = window.location
                  .toString()
                  .replace("https://www.troddit.com", r);
              }}
              actionLabel={`Go now?`}
              showAll={true}
            />
          ),
          { position: "bottom-center", duration: Infinity, id: "check" }
        );
      } else {
        toast.remove("check");
      }
      return isBlocked;
    };

    const posts = feed?.data?.pages
      ?.map((page) => page.filtered)
      ?.flat() as any[];
    if (posts?.length > 0) {
      let isBlocked = false;
      if (!checked && !blocked && domain === "www.troddit.com") {
        isBlocked = check(posts);
      }
      if (!isBlocked && !blocked) {
        if (posts?.length > items?.length) {
          //console.log('new posts')
          updatePostsInPlace(posts, true);
        } else {
          //console.log('update in place posts')
          updatePostsInPlace(posts);
        }
      }
    } else if (feed.hasNextPage && !blocked) {
      //console.log("nodata.. fetching more");
      feed.fetchNextPage();
    }
  }, [feed?.data?.pages]);

  const overwritePosts = () => {
    setMasonicKey((k) => `${k}_${Math.random()}`);
    setNewPostsCount(0);
    setItems(newPosts);
  };
  useEffect(() => {
    if (newPostsCount > 0) {
      toast.remove("new_post");
      if (!context.askToUpdateFeed) {
        overwritePosts();
      } else {
        let tId = toast.custom(
          (t) => (
            <ToastCustom
              t={t}
              message={`${newPostsCount} new post${
                newPostsCount === 1 ? "" : "s"
              }`}
              mode={"new_posts"}
              action={overwritePosts}
              actionLabel={`Update feed?`}
            />
          ),
          { position: "bottom-right", duration: Infinity, id: "new_post" }
        );
      }
    }
    () => {
      toast.remove("new_post");
    };
  }, [newPostsCount]);
  useEffect(() => {
    return () => {
      toast.remove("new_post");
    };
  }, []);
  useEffect(() => {
    if (items) {
      setFeedData(items);
    }
    return () => {
      setFeedData([]);
    };
  }, [items]);

  const loadMoreItems = async (startIndex, stopIndex) => {
    feed?.fetchNextPage();
  };
  const maybeLoadMorePosts = useInfiniteLoader(
    async (startIndex, stopIndex, currentItems) => {
      if (
        (context?.infiniteLoading ||
          (initItems?.length < 1 && currentItems.length < 1)) &&
        !feed.isFetching &&
        !feed.isLoading &&
        feed.hasNextPage &&
        !blocked
      ) {
        return await loadMoreItems(startIndex, stopIndex);
      }
    },
    {
      isItemLoaded: (index, items) => {
        //console.log("isitemloaded",index,items, !!items[index]);
        return !!items?.[index];
      },
      minimumBatchSize: 10,
      threshold: 10,
    }
  );

  const loadInfo = (
    <>
      {!feed.isFetching && !feed.hasNextPage && feed.isFetched && !feed.error && (
        <div className="flex flex-row items-center justify-center my-6 text-sm font-light">
          <h1>
            Loaded {items?.length} post{items?.length === 1 ? "" : "s"} on{" "}
            {feed.data?.pages?.length} page
            {feed.data?.pages?.length === 1 ? "" : "s"}.{" "}
          </h1>
        </div>
      )}
    </>
  );

  // const heightMap = useMemo(() => {
  //   console.log("reset map..");
  //   return new Map();
  // }, [cols, windowWidth, context.cardStyle, context.mediaOnly, context.wideUI]);
  const seenMap = useMemo(
    () => new Map(),
    [
      cols,
      windowWidth,
      context.cardStyle,
      context.mediaOnly,
      context.wideUI,
      uniformMediaMode,
    ]
  );
  const { createMaps, setHeight, setSeen, getHeights, getSeen } = useHeightMap({
    columns: cols,
    cardStyle: context.cardStyle,
    mediaOnly: context.mediaOnly,
    wideUI: context.wideUI,
    windowWidth: windowWidth,
    compactLinkPics: context.compactLinkPics,
    uniformMediaMode: uniformMediaMode as boolean,
  });
  const {
    createGlobalState,
    clearGlobalState,
    getGlobalData,
    setGlobalData,
    getGlobalKey,
  } = useGlobalState([
    "lastScrollTop",
    curKey,
    cols,
    context.cardStyle,
    context.mediaOnly,
    context.wideUI,
    windowWidth,
    context.compactLinkPics,
    uniformMediaMode,
  ]);
  const [jumped, setJumped] = useState(false);

  useLayoutEffect(() => {
    if (context.cardStyle === "row1") {
      const lastScroll = getGlobalData()?.get("lastTop");
      if (lastScroll > 100 && !jumped) {
        window.scrollTo({ top: lastScroll, behavior: "auto" });
        //console.log("jump", lastScroll);
        setJumped(true);
      }
    }
  }, [
    curKey,
    cols,
    context.cardStyle,
    context.mediaOnly,
    context.wideUI,
    windowWidth,
    context.compactLinkPics,
  ]);

  const [feedLoading, setFeedLoading] = useState(true);
  useEffect(() => {
    if (feed.isFetching && !feed.isError && context.infiniteLoading) {
      setFeedLoading(true);
    } else {
      setFeedLoading(false);
    }
  }, [feed, context?.infiniteLoading]);

  useEffect(() => {
    if (
      !context.postOpen &&
      cols > 0 &&
      windowWidth > 0 &&
      context.cardStyle &&
      (context.mediaOnly === true || context.mediaOnly === false) &&
      (context.wideUI === true || context.wideUI === false)
    ) {
      createMaps();
    }
  }, [
    cols,
    windowWidth,
    context.cardStyle,
    context.mediaOnly,
    context.wideUI,
    uniformMediaMode,
  ]);

  const margin = useMemo(
    () =>
      context.cardStyle === "row1"
        ? "m-0"
        : cols === 1
        ? "m-1"
        : cols > 1 && windowWidth < 640 //sm
        ? "m-0"
        : cols > 3 && windowWidth < 1280 //xl
        ? "m-0.5"
        : cols > 3 && windowWidth > 1280 //xl
        ? "m-1"
        : "m-1",
    [cols, context.cardStyle, windowWidth]
  );

  const handleIntersectChange = (
    inView: boolean,
    entry: IntersectionObserverEntry,
    post
  ) => {
    if (
      entry.intersectionRect?.x === 0 &&
      !inView &&
      entry.boundingClientRect.top < 0 &&
      Math.abs(entry?.boundingClientRect?.bottom) < (windowHeight * 1) / 2
    ) {
      //console.log(post?.data?.title)
      //setSeen(post?.data?.name, { seen: true });
      seenMap.set(post?.data?.name, { seen: true }); //using local map instead.. don't want to prerender heights if they haven't been scrolled onto the page yet
      context?.autoSeen &&
        localSeen.setItem(post?.data?.name, { time: new Date() });
    }
    context.cardStyle === "row1" && setGlobalData("lastTop", window.scrollY);
  };

  const handleSizeChange = (postName, height) => {
    const pHeight = getHeights()?.get(postName)?.height ?? 0;
    if (height > pHeight) {
      setHeight(postName, { height: height });
      //heightMap.set(postName, { height: height });
    }
  };

  //for when rows are collapsed
  const forceSizeChange = (postName, height) => {
    setHeight(postName, { height: height });
    //heightMap.set(postName, { height: height });
  };

  const PostCard = useCallback(
    (props) => {
      const post = props?.data;
      const seen = seenMap?.get(props?.data?.data?.name)?.seen === true; //getSeen()?.get(props?.data?.data?.name)?.seen === true;
      const knownHeight = getHeights()?.get(props?.data?.data?.name)?.height;

      let m = parseInt(margin.split("m-")?.[1] ?? 0);
      let width = props.width - 2 - m * 8; //-border-margin
      if (context.cardStyle === "card1" && !context.mediaOnly) {
        width -= 24;
      }
      let minHeight = 0;
      if (!uniformMediaMode) {
        if (context.cardStyle !== "row1") {
          minHeight =
            !post?.data?.mediaInfo?.isSelf &&
            !(post?.data?.mediaInfo?.isLink && context?.compactLinkPics) &&
            !post?.data?.mediaInfo?.isTweet &&
            !post?.data?.mediaInfo?.isGallery &&
            post?.data?.mediaInfo?.dimensions?.[0] > 0
              ? (width / post?.data?.mediaInfo?.dimensions[0]) *
                post.data.mediaInfo.dimensions[1]
              : 0;
          let h = minHeight;
          if (
            post?.data?.mediaInfo?.isImage &&
            post?.data?.mediaInfo?.imageInfo?.length > 0 &&
            !post?.mediaInfo?.isGallery &&
            !(post?.data?.mediaInfo?.isLink && context?.compactLinkPics)
          ) {
            let num = findOptimalImageIndex(post?.data?.mediaInfo?.imageInfo, {
              imgFull: false,
              fullRes: false,
              postMode: false,
              context: {
                cardStyle: context.cardStyle,
                saveWideUI: context.saveWideUI,
                columns: cols,
              },
              windowWidth,
              containerDims: false,
            });
            minHeight =
              (width / post?.data?.mediaInfo?.imageInfo?.[num]?.width) *
              post?.data?.mediaInfo?.imageInfo?.[num]?.height;
          }

          if (post?.data?.mediaInfo?.isGallery) {
            let images = post.data.mediaInfo.gallery;
            const { tallest, widest, ratio, fImages } = findGreatestsImages(
              images,
              cols === 1 ? windowHeight * 0.75 : windowHeight * 0.95
            );
            if (cols === 1) {
              minHeight = Math.min(
                windowHeight * 0.75,
                ratio?.height * (width / ratio?.width)
              );
            } else {
              minHeight = tallest?.height * (width / widest?.width);
            }
          }
          if (cols === 1 && post?.data?.mediaInfo?.isVideo) {
            minHeight = Math.min(h, post?.data?.mediaInfo?.dimensions[1]);
          }
          if (cols === 1) {
            minHeight = Math.min(windowHeight * 0.75, minHeight);
          }
        }
      }
      return (
        <InView
          role={"gridcell"}
          threshold={0}
          onChange={(inView, entry) =>
            handleIntersectChange(inView, entry, post)
          }
        >
          {({ inView, ref, entry }) => (
            <div
              ref={ref}
              className={
                margin +
                (knownHeight && seen
                  ? " hover:z-50 overflow-hidden hover:overflow-visible"
                  : "")
                // + " outline " //outlines for debugging..
              }
              style={
                uniformMediaMode
                  ? {
                      height: `${(width * 16) / 9}px`,
                    }
                  : knownHeight > 0 && seen
                  ? context.cardStyle === "row1" //rows need to grow
                    ? {
                        minHeight: `${knownHeight}px`,
                        // outlineWidth: "2px",
                        // outlineColor: "green",
                      }
                    : {
                        height: `${knownHeight}px`,
                        // outlineWidth: "2px",
                        // outlineColor: "green",
                      }
                  : minHeight > 0
                  ? {
                      minHeight: `${minHeight}px`,
                      // outlineWidth: "2px",
                      // outlineColor: "blue",
                    }
                  : {
                      minHeight: `${80}px`,
                      // outlineWidth: "2px",
                      // outlineColor: "red",
                    }
                // seen === true
                // ? { outlineWidth: "2px", outlineColor: "red" }
                // : knownHeight > 0
                // ? { outlineWidth: "2px", outlineColor: "blue" }
                // : { outlineWidth: "2px", outlineColor: "white" }
              }
            >
              <Post
                post={props.data}
                postNum={props.index}
                openPost={openPost}
                handleSizeChange={handleSizeChange}
                forceSizeChange={forceSizeChange}
                uniformMediaMode={uniformMediaMode}
              />
            </div>
          )}
        </InView>
      );
    },

    [
      cols,
      windowWidth,
      context.cardStyle,
      context.wideUI,
      context.mediaOnly,
      uniformMediaMode,
    ]
  );
  const filteredHeights = Array.from(getHeights()?.values() ?? [])
    .filter((m: any) => m?.height > 0)
    ?.map((m: any) => m?.height);
  const aveHeight =
    filteredHeights?.reduce((a: any, b: any) => a + b, 0) /
    filteredHeights.length;

  const router = useRouter();
  const [lastRoute, setLastRoute] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>();
  const openPost = (post, postNum, nav) => {
    setLastRoute(router.asPath);
    setSelectedPost({
      post: post,
      postNum: postNum,
      nav: nav,
    });
  };
  useEffect(() => {
    if (lastRoute === router.asPath) {
      setSelectedPost(undefined);
      context.setMediaMode(false);
      context.setPauseAll(false);
    }
    //don't add lastRoute to the array, breaks things
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  return (
    <>
      {selectedPost && (
        <PostModal
          permalink={selectedPost?.data?.permalink}
          setSelect={setSelectedPost}
          returnRoute={
            router.query?.slug?.[1]?.toUpperCase() === "M"
              ? "multimode"
              : undefined
          }
          postData={selectedPost?.post?.data}
          postNum={selectedPost?.postNum}
          commentMode={selectedPost?.kind === "t1"}
          commentsDirect={selectedPost?.nav?.toComments}
          mediaMode={selectedPost?.nav?.toMedia}
          curKey={curKey}
          fetchMore={feed.fetchNextPage}
        />
      )}
      <div>
        {uniformMediaMode ? (
          <MasonicStatic
            items={items}
            render={PostCard}
            onRender={maybeLoadMorePosts}
            cols={cols}
            margin={margin}
            key={`${masonicKey}_${uniformMediaMode ? "uniform" : "variable"}_${
              cols === 1 ? "1col" : "multiCol"
            }`}
          />
        ) : (
          <Masonry
            role="list"
            key={`${masonicKey}_${uniformMediaMode ? "uniform" : "variable"}_${
              cols === 1 ? "1col" : "multiCol"
            }`}
            onRender={maybeLoadMorePosts}
            columnGutter={0}
            columnCount={cols}
            items={items}
            itemHeightEstimate={aveHeight > 0 ? aveHeight : 0}
            overscanBy={2}
            render={PostCard}
            className="outline-none"
            ssrWidth={500}
          />
        )}

        {!context?.infiniteLoading && feed.hasNextPage && (
          <div className="flex items-center justify-center mt-6 mb-6">
            <button
              aria-label="load more"
              disabled={feed.isLoading || feed.isFetchingNextPage}
              onClick={() => {
                loadMoreItems(items.length, items.length + 20);
              }}
              className={
                (feed.isLoading || feed.isFetchingNextPage
                  ? " animate-pulse "
                  : " cursor-pointer hover:bg-th-postHover hover:border-th-borderHighlight shadow-2xl  ") +
                "flex items-center justify-center px-4 py-2 border rounded-md  h-9 border-th-border bg-th-post "
              }
            >
              <h1>Load Page {(feed?.data?.pages?.length ?? 1) + 1}</h1>
            </button>
          </div>
        )}
        {feedLoading && (
          <div className="flex flex-col items-center justify-center w-full gap-2 py-4 text-center">
            <span>Loading page {(feed?.data?.pages?.length ?? 0) + 1} </span>
            <div className="opacity-80 text-th-accent">
              <Spinner size={20} />
            </div>
          </div>
        )}

        {loadInfo}
      </div>
    </>
  );
};

export default MyMasonic;
