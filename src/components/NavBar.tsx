import Search from "./Search";
import { useEffect, useState } from "react";
import Link from "next/link";
import Login from "./Login";
import DropdownPane from "./DropdownPane";
import Sort from "./Sort";
import ThemeToggle from "./ThemeToggle";
import NSFWToggle from "./NSFWToggle";

import { CgMenu } from "react-icons/cg";
import SideNav from "./SideNav";
import NavMenu from "./NavMenu";
import SortMenu from "./SortMenu";

import { useRouter } from "next/router";
import SortMenu2 from "./SortMenu2";

import { useSession } from "next-auth/client";

const NavBar = () => {
  const [hidden, setHidden] = useState(false);
  const [prevScrollpos, setScrollpos] = useState(0);
  const session = useSession();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const onScroll = () => {
      setSidebarVisible(false);
      var currentScrollPos = window.pageYOffset;
      if (prevScrollpos > currentScrollPos) {
        setHidden(false);
      } else if (router.query?.slug?.[1] !== "comments") {
        setHidden(true);
      }
      setScrollpos(currentScrollPos);
    };
    window.addEventListener("scroll", onScroll);
    setScrollpos(window.pageYOffset);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [prevScrollpos]);

  useEffect(() => {
    console.log("NAVBAR", router.query);
    if (router.query?.slug?.[1] === "comments" || true) {
      setHidden(false);
    }
  }, [router]);

  return (
    <header
      className={
        `${hidden ? "-translate-y-full" : ""}` +
        " z-50 fixed top-0 transition duration-500 ease-in-out transform h-14 border w-screen "
      }
    >
      <SideNav visible={sidebarVisible} toggle={setSidebarVisible} />
      <nav className="flex flex-row items-center justify-between flex-grow h-full bg-white shadow-lg dark:bg-trueGray-900">
        <CgMenu
          className="md:hidden"
          onClick={() => setSidebarVisible((vis) => !vis)}
        />
        <div className="flex flex-row items-center justify-start flex-grow h-full space-x-2">
        <Link href="/" passHref>
          <h1 className="">Truddit</h1>
        </Link>

        <div className="hidden h-full border border-black md:block w-60">
          <DropdownPane hide={hidden} />
        </div>

        <div className="hidden w-1/3 h-full md:block">
          <Search />
        </div>
        </div>
        <div className="flex flex-row items-center justify-end h-full space-x-1 justify-self-end">
        <div className="w-20 h-full">
          <SortMenu2 hide={hidden} />
        </div>
        <div className={!session ? "hidden" : "hidden w-20 h-full border  md:block"}>
          <Login />
        </div>
        <div className="flex flex-row items-center w-10 h-full ">
          <NavMenu hide={hidden} />
        </div>
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
