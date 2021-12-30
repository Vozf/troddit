import { useEffect, useState } from "react";
import Post from "./Post";
//import Masonry from "react-masonry-css";
import {
  loadFront,
  loadPost,
  loadSubreddits,
  loadUserPosts,
  loadSubInfo,
} from "../RedditAPI";

import { useRouter } from "next/router";
import { useMainContext } from "../MainContext";
import { getSession, useSession } from "next-auth/client";
import PostModal from "./PostModal";
import LoginModal from "./LoginModal";
import SubredditBanner from "./SubredditBanner";

import MyMasonic from "./MyMasonic";

const Feed = ({ query, isUser = false }) => {
  const [session, sessloading] = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fetchPost, setFetchPost] = useState(false);
  const context: any = useMainContext();
  // const breakpointColumnsObj = {
  //   default: 4,
  //   2560: 3,
  //   1280: 2,
  //   767: 1,
  // };
  const [posts, setPosts] = useState([]);
  const [numposts, setNumPosts] = useState(0);
  const [after, setAfter] = useState("");
  const [subreddits, setSubreddits] = useState("");
  const [subsArray, setSubsArray] = useState([]);
  const [isSubreddit, setIsSubreddit] = useState(false);
  const [loggedIn, setloggedIn] = useState(false);
  const [sort, setSort] = useState("");
  const [range, setRange] = useState("");

  useEffect(() => {
    session ? setloggedIn(true) : setloggedIn(false);
    return () => {
      setloggedIn(false);
    };
  }, [session]);

  useEffect(() => {
    if (query?.slug?.[1] === "comments") {
      setFetchPost(true);
      setLoading(false);
    } else if (query.frontsort) {
      if (
        query?.frontsort == "" ||
        query?.frontsort?.includes("best") ||
        query?.frontsort?.includes("top") ||
        query?.frontsort?.includes("hot") ||
        query?.frontsort?.includes("new") ||
        query?.frontsort?.includes("rising")
      ) {
        setSort(query?.frontsort ?? "best");
        setRange(query?.t ?? "");
      } else {
        setFetchPost(true);
        setLoading(false);
      }
      //fetchFront();
    } else if (query.slug) {
      setSubreddits(query?.slug?.[0] ?? "");
      setSort(query?.slug?.[1] ?? "best");
      setRange(query?.t ?? "");
      //fetchSubs();
    }
    return () => {};
  }, [query]);

  useEffect(() => {
    if (query?.slug?.[1] === "comments") {
      setFetchPost(true);
      setLoading(false);
    } else if (query.frontsort) {
      if (
        query?.frontsort == "" ||
        query?.frontsort?.includes("best") ||
        query?.frontsort?.includes("top") ||
        query?.frontsort?.includes("hot") ||
        query?.frontsort?.includes("new") ||
        query?.frontsort?.includes("rising")
      ) {
        setSort(query?.frontsort ?? "best");
        setRange(query?.t ?? "");
        fetchFront();
      }
    } else if (query.slug) {
      setSubreddits(query?.slug?.[0] ?? "");
      setSort(query?.slug?.[1] ?? "best");
      setRange(query?.t ?? "");
      fetchSubs();
    }
    return () => {
      setPosts([]);
      setAfter("");
      setNumPosts(0);
      setFetchPost(false);
      setError(false);
      setLoading(true);
    };
  }, [subreddits, sort, range]);

  const fetchFront = async () => {
    //console.log(query);
    let data = await loadFront(
      query?.frontsort ?? "hot",
      query?.t ?? "",
      "",
      undefined,
      context?.localSubs
    );
    if (data?.children) {
      //console.log("DATA", data);

      setLoading(false);

      setNumPosts((n) => n + data.children.length);
      setAfter(data?.after);
      setPosts(data.children);
      return data.children;
    } else {
      setLoading(false);
      setError(true);
    }
  };

  const fetchSubs = async () => {
    //console.log(query);
    let data: any;
    if (query?.slug?.[1] === "comments") {
      setFetchPost(true);
      setLoading(false);
    } else if (isUser) {
      data = await loadUserPosts(
        query?.slug?.[0] ?? "",
        query?.slug?.[1] ?? "hot",
        query?.t ?? ""
      );
    } else {
      //console.log(query?.slug?.[0]);
      let subs = query?.slug?.[0]
        .split(" ")
        .join("+")
        .split(",")
        .join("+")
        .split("%20")
        .join("+");
        setSubsArray(subs.split('+'));
      data = await loadSubreddits(
        subs ?? "",
        query?.slug?.[1] ?? "hot",
        query?.t ?? ""
      );
    }
    if (data?.children) {
      setIsSubreddit(true);
      setAfter(data?.after);
      setPosts(data.children);
      setNumPosts((n) => n + data.children.length);
      setLoading(false);
    } else {
      setLoading(false);
      setError(true);
    }
  };

  if (loading) {
    return (
      <div className="absolute w-screen h-16 bg-blue-700 animate-pulse"></div>
    );
  }
  if (fetchPost) {
    return (
      <div className="mt-10">
        <LoginModal />
        <PostModal
          permalink={
            query?.frontsort
              ? `/${query.frontsort}`
              : "/r/" + query.slug.join("/")
          }
          returnRoute={query.slug?.[0] ? `/r/${query.slug[0]}` : "/"}
          setSelect={setFetchPost}
        />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center mt-16 text-center">
        <div>{"Oops something went wrong :("}</div>
        <div>
          {
            "Please refresh and make sure you're not blocking traffic from Reddit"
          }
        </div>
        {subreddits !== "" && (
          <div>{"Otherwise, this subreddit may not exist"}</div>
        )}
      </div>
    );
  }
  return (
    <main>
      <LoginModal />
      <div className="flex flex-col items-center flex-none w-screen pt-16">
        <div className="w-screen ">
          {isSubreddit && subsArray?.[0]?.toUpperCase() !== "ALL" && subsArray?.[0]?.toUpperCase() !== "POPULAR" && (
            <SubredditBanner
              subreddits={
                query?.slug?.[0]
              }
            />
          )}
        </div>

        <div className={"w-full md:w-11/12"}>
          {/* + (context?.maximize ? " " : " md:w-5/6") */}
          <MyMasonic
            query={query}
            initItems={posts}
            initAfter={after}
            isUser={isUser}
          />
        </div>
      </div>
    </main>

    // <section className="flex flex-col items-center flex-none w-screen pt-16">
    //   <LoginModal />
    //   {/* {`query: slug[0] ${query?.slug?.[0]}   slug[1] ${query?.slug?.[1]}   t: ${query?.t}`} */}
    //   <div className="w-11/12 md:w-5/6">

    //     <InfiniteScroll
    //       dataLength={posts.length}
    //       next={loadmore}
    //       hasMore={after ? true : false}
    //       loader={<div className="flex flex-row justify-center"><h1>Loading More..</h1></div>}
    //       endMessage={
    //         <div className="flex flex-row justify-center">
    //           <b>You have reached the end after {posts?.length ?? 0} posts from {count+1} pages</b>
    //         </div>
    //       }
    //     >
    //       <Masonry
    //         breakpointCols={breakpointColumnsObj}
    //         className="my-masonry-grid"
    //         columnClassName="my-masonry-grid_column"
    //       >
    //         {posts.map((post, i) => (
    //           <Post key={`${post.data.id}_${i}`} post={post.data} />
    //         ))}
    //       </Masonry>
    //     </InfiniteScroll>
    //   </div>
    //   <button className={"mt-2 " + (after ? "block" : "hidden")} name="load more" onClick={loadmore}>Load More</button>
    // </section>
  );
};

export default Feed;
